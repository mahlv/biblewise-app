import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { internalMutation, mutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { prayerCategoryValidator, prayerTypeValidator } from './schema';
import { createNotification } from './lib/notify';
import { findUser, requireUser } from './lib/requireUser';
import { ANONYMOUS_AUTHOR_NAME, PRAYER_LIMITS } from '../lib/prayerCategories';
import { appError } from '../lib/serverErrors';

/**
 * Prayer wall (requests and testimonies).
 *
 * Security model (the app has no login yet): every function takes the device `anonymousId` and
 * resolves the user from it. Public results never contain that id nor the author's users id —
 * only the derived flags `isMine` / `amenedByMe`. Anonymous posts expose no name, location or avatar.
 * TODO(clerk): derive the user from `ctx.auth`.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const CHILD_BATCH = 200;
const COMMENT_BATCH = 50;

const prayerViewValidator = v.object({
  _id: v.id('prayers'),
  type: prayerTypeValidator,
  category: prayerCategoryValidator,
  title: v.string(),
  content: v.string(),
  scriptureReference: v.optional(v.string()),
  scriptureText: v.optional(v.string()),
  amenCount: v.number(),
  commentCount: v.number(),
  createdAt: v.number(),
  author: v.object({
    name: v.string(),
    location: v.union(v.string(), v.null()),
    imageUrl: v.union(v.string(), v.null()),
    isAnonymous: v.boolean(),
  }),
  isMine: v.boolean(),
  amenedByMe: v.boolean(),
});

/** What the clients receive: no author id, and nothing identifying for anonymous posts. */
async function toView(ctx: QueryCtx, prayer: Doc<'prayers'>, viewer: Doc<'users'> | null) {
  const amen = viewer
    ? await ctx.db
        .query('prayerAmens')
        .withIndex('by_prayerId_and_userId', (q) => q.eq('prayerId', prayer._id).eq('userId', viewer._id))
        .unique()
    : null;
  const imageUrl = !prayer.isAnonymous && prayer.authorImageId ? await ctx.storage.getUrl(prayer.authorImageId) : null;

  return {
    _id: prayer._id,
    type: prayer.type,
    category: prayer.category,
    title: prayer.title,
    content: prayer.content,
    scriptureReference: prayer.scriptureReference,
    scriptureText: prayer.scriptureText,
    amenCount: prayer.amenCount,
    commentCount: prayer.commentCount,
    createdAt: prayer.createdAt,
    author: {
      name: prayer.isAnonymous ? ANONYMOUS_AUTHOR_NAME : prayer.authorName,
      location: prayer.isAnonymous ? null : (prayer.authorLocation ?? null),
      imageUrl,
      isAnonymous: prayer.isAnonymous,
    },
    isMine: viewer?._id === prayer.authorId,
    amenedByMe: amen !== null,
  };
}

/** A post is visible unless hidden by reports; the author always sees their own. */
async function getVisiblePrayer(ctx: MutationCtx, prayerId: Id<'prayers'>, user: Doc<'users'>): Promise<Doc<'prayers'>> {
  const prayer = await ctx.db.get('prayers', prayerId);
  if (!prayer || (prayer.isHidden && prayer.authorId !== user._id)) throw appError('prayerNotFound');
  return prayer;
}

const clean = (value: string | undefined): string => (value ?? '').replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const createPrayer = mutation({
  args: {
    anonymousId: v.string(),
    type: prayerTypeValidator,
    category: prayerCategoryValidator,
    title: v.string(),
    content: v.string(),
    scriptureReference: v.optional(v.string()),
    scriptureText: v.optional(v.string()),
    isAnonymous: v.boolean(),
  },
  returns: v.id('prayers'),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.anonymousId);

    const title = clean(args.title);
    // Keep paragraphs in the message: only collapse spaces and tabs.
    const content = args.content.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    const scriptureReference = clean(args.scriptureReference);
    const scriptureText = clean(args.scriptureText);

    if (!title) throw appError('titleRequired');
    if (title.length > PRAYER_LIMITS.title) throw appError('titleTooLong', { max: PRAYER_LIMITS.title });
    if (!content) throw appError('messageRequired');
    if (content.length > PRAYER_LIMITS.content) throw appError('messageTooLong', { max: PRAYER_LIMITS.content });
    if (scriptureReference.length > PRAYER_LIMITS.scriptureReference || scriptureText.length > PRAYER_LIMITS.scriptureText) {
      throw appError('scriptureTooLong');
    }

    const now = Date.now();
    const recent = await ctx.db
      .query('prayers')
      .withIndex('by_authorId_and_createdAt', (q) => q.eq('authorId', user._id).gte('createdAt', now - DAY_MS))
      .take(PRAYER_LIMITS.dailyPosts);
    if (recent.length >= PRAYER_LIMITS.dailyPosts) {
      throw appError('dailyPostLimit');
    }

    // Without a profile name the post is always anonymous.
    const name = user.name?.trim();
    const isAnonymous = args.isAnonymous || !name;
    const location = [user.city?.trim(), user.country?.trim()].filter(Boolean).join(', ');

    return await ctx.db.insert('prayers', {
      authorId: user._id,
      authorName: isAnonymous ? ANONYMOUS_AUTHOR_NAME : name,
      authorLocation: !isAnonymous && location ? location : undefined,
      authorImageId: !isAnonymous ? user.profileImageId : undefined,
      isAnonymous,
      type: args.type,
      category: args.category,
      title,
      content,
      scriptureReference: scriptureReference || undefined,
      scriptureText: scriptureText || undefined,
      amenCount: 0,
      commentCount: 0,
      reportCount: 0,
      isHidden: false,
      searchText: [title, content, args.category, isAnonymous ? '' : name].join(' '),
      createdAt: now,
    });
  },
});

/** Wall feed, newest first (or best match when searching). `mine` lists the viewer's own posts. */
export const listPrayers = query({
  args: {
    anonymousId: v.optional(v.string()),
    type: v.optional(v.union(prayerTypeValidator, v.literal('all'))),
    mine: v.optional(v.boolean()),
    searchTerm: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(prayerViewValidator),
  handler: async (ctx, args) => {
    const viewer = args.anonymousId ? await findUser(ctx, args.anonymousId) : null;
    const type = args.type && args.type !== 'all' ? args.type : undefined;
    const term = args.searchTerm?.trim();

    let result;
    if (args.mine) {
      if (!viewer) return { page: [], isDone: true, continueCursor: '' };
      const own = ctx.db
        .query('prayers')
        .withIndex('by_authorId_and_createdAt', (q) => q.eq('authorId', viewer._id))
        .order('desc');
      result = await (type ? own.filter((q) => q.eq(q.field('type'), type)) : own).paginate(args.paginationOpts);
    } else if (term) {
      result = await ctx.db
        .query('prayers')
        .withSearchIndex('search_text', (q) => {
          const search = q.search('searchText', term).eq('isHidden', false);
          return type ? search.eq('type', type) : search;
        })
        .paginate(args.paginationOpts);
    } else if (type) {
      result = await ctx.db
        .query('prayers')
        .withIndex('by_type_and_isHidden_and_createdAt', (q) => q.eq('type', type).eq('isHidden', false))
        .order('desc')
        .paginate(args.paginationOpts);
    } else {
      result = await ctx.db
        .query('prayers')
        .withIndex('by_isHidden_and_createdAt', (q) => q.eq('isHidden', false))
        .order('desc')
        .paginate(args.paginationOpts);
    }

    return { ...result, page: await Promise.all(result.page.map((prayer) => toView(ctx, prayer, viewer))) };
  },
});

/** One post for the detail screen (null when it doesn't exist or is hidden for this viewer). */
export const getPrayer = query({
  args: { anonymousId: v.optional(v.string()), prayerId: v.id('prayers') },
  returns: v.union(prayerViewValidator, v.null()),
  handler: async (ctx, args) => {
    const viewer = args.anonymousId ? await findUser(ctx, args.anonymousId) : null;
    const prayer = await ctx.db.get('prayers', args.prayerId);
    if (!prayer || (prayer.isHidden && prayer.authorId !== viewer?._id)) return null;
    return await toView(ctx, prayer, viewer);
  },
});

/** Adds or removes the viewer's like ("Amém" in the data model). Idempotent per user thanks to the (prayer, user) row. */
export const toggleAmen = mutation({
  args: { anonymousId: v.string(), prayerId: v.id('prayers') },
  returns: v.object({ amened: v.boolean(), amenCount: v.number() }),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.anonymousId);
    const prayer = await getVisiblePrayer(ctx, args.prayerId, user);

    const existing = await ctx.db
      .query('prayerAmens')
      .withIndex('by_prayerId_and_userId', (q) => q.eq('prayerId', prayer._id).eq('userId', user._id))
      .unique();

    if (existing) {
      const amenCount = Math.max(0, prayer.amenCount - 1);
      await ctx.db.delete('prayerAmens', existing._id);
      await ctx.db.patch('prayers', prayer._id, { amenCount });
      return { amened: false, amenCount };
    }
    const amenCount = prayer.amenCount + 1;
    await ctx.db.insert('prayerAmens', { prayerId: prayer._id, userId: user._id, createdAt: Date.now() });
    await ctx.db.patch('prayers', prayer._id, { amenCount });

    // Tell the author (never for their own like, and only once per person and post).
    await createNotification(ctx, {
      recipientId: prayer.authorId,
      actorId: user._id,
      type: 'like',
      prayer,
      actorName: user.name?.trim() || 'Alguém',
      dedupeKey: `like:${prayer._id}:${user._id}`,
    });
    return { amened: true, amenCount };
  },
});

/** Reports someone else's post; it is hidden automatically after enough distinct reports. */
export const reportPrayer = mutation({
  args: { anonymousId: v.string(), prayerId: v.id('prayers') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.anonymousId);
    const prayer = await getVisiblePrayer(ctx, args.prayerId, user);
    if (prayer.authorId === user._id) throw appError('reportOwnPrayer');

    const already = await ctx.db
      .query('prayerReports')
      .withIndex('by_prayerId_and_userId', (q) => q.eq('prayerId', prayer._id).eq('userId', user._id))
      .unique();
    if (already) return null;

    await ctx.db.insert('prayerReports', { prayerId: prayer._id, userId: user._id, createdAt: Date.now() });
    const reportCount = prayer.reportCount + 1;
    await ctx.db.patch('prayers', prayer._id, { reportCount, isHidden: prayer.isHidden || reportCount >= PRAYER_LIMITS.reportsToHide });
    return null;
  },
});

export const deletePrayer = mutation({
  args: { anonymousId: v.string(), prayerId: v.id('prayers') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.anonymousId);
    const prayer = await ctx.db.get('prayers', args.prayerId);
    if (!prayer || prayer.authorId !== user._id) throw appError('prayerNotFound');

    await ctx.db.delete('prayers', prayer._id);
    // Amens/reports can be many: remove them in batches outside this transaction.
    await ctx.scheduler.runAfter(0, internal.prayers.purgePrayerChildren, { prayerId: prayer._id });
    return null;
  },
});

/** Numbers for the three cards at the top of "Meu Diário" (each capped, shown as "200+"). */
export const getUserStats = query({
  args: { anonymousId: v.string() },
  returns: v.object({ recordings: v.number(), prayers: v.number(), testimonies: v.number() }),
  handler: async (ctx, args) => {
    const user = await findUser(ctx, args.anonymousId);
    if (!user) return { recordings: 0, prayers: 0, testimonies: 0 };

    const cap = PRAYER_LIMITS.statsCap;
    const recordings = await ctx.db
      .query('recordings')
      .withIndex('by_anonymous_id', (q) => q.eq('anonymousId', args.anonymousId))
      .take(cap);
    const posts = await ctx.db
      .query('prayers')
      .withIndex('by_authorId_and_createdAt', (q) => q.eq('authorId', user._id))
      .take(cap);

    return {
      recordings: recordings.length,
      prayers: posts.filter((post) => post.type === 'request').length,
      testimonies: posts.filter((post) => post.type === 'testimony').length,
    };
  },
});

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

/** Deletes the amens and reports of a removed prayer, rescheduling itself while rows remain. */
export const purgePrayerChildren = internalMutation({
  args: { prayerId: v.id('prayers') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const amens = await ctx.db
      .query('prayerAmens')
      .withIndex('by_prayerId_and_userId', (q) => q.eq('prayerId', args.prayerId))
      .take(CHILD_BATCH);
    const reports = await ctx.db
      .query('prayerReports')
      .withIndex('by_prayerId_and_userId', (q) => q.eq('prayerId', args.prayerId))
      .take(CHILD_BATCH);

    const comments = await ctx.db
      .query('prayerComments')
      .withIndex('by_prayerId', (q) => q.eq('prayerId', args.prayerId))
      .take(COMMENT_BATCH);
    const notifications = await ctx.db
      .query('notifications')
      .withIndex('by_prayerId', (q) => q.eq('prayerId', args.prayerId))
      .take(CHILD_BATCH);

    for (const amen of amens) await ctx.db.delete('prayerAmens', amen._id);
    for (const report of reports) await ctx.db.delete('prayerReports', report._id);
    for (const notification of notifications) await ctx.db.delete('notifications', notification._id);
    for (const comment of comments) {
      const commentReports = await ctx.db
        .query('prayerCommentReports')
        .withIndex('by_commentId_and_userId', (q) => q.eq('commentId', comment._id))
        .take(CHILD_BATCH);
      for (const report of commentReports) await ctx.db.delete('prayerCommentReports', report._id);
      await ctx.db.delete('prayerComments', comment._id);
    }

    if (
      amens.length === CHILD_BATCH ||
      reports.length === CHILD_BATCH ||
      notifications.length === CHILD_BATCH ||
      comments.length === COMMENT_BATCH
    ) {
      await ctx.scheduler.runAfter(0, internal.prayers.purgePrayerChildren, { prayerId: args.prayerId });
    }
    return null;
  },
});
