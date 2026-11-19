import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { v } from 'convex/values';
import type { Doc } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import type { QueryCtx } from './_generated/server';
import { createNotification } from './lib/notify';
import { findUser, requireUser } from './lib/requireUser';
import { ANONYMOUS_AUTHOR_NAME, PRAYER_LIMITS } from '../lib/prayerCategories';

/**
 * Comments on prayer wall posts (flat, no replies).
 *
 * Same privacy model as posts: results never contain a users id or the device `anonymousId`,
 * only derived flags (`isMine`, `isPostAuthor`). The author of an anonymous post stays
 * anonymous when commenting on it.
 * TODO(clerk): derive the user from `ctx.auth`.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const REPORT_BATCH = 50;

const commentViewValidator = v.object({
  _id: v.id('prayerComments'),
  content: v.string(),
  createdAt: v.number(),
  author: v.object({
    name: v.string(),
    imageUrl: v.union(v.string(), v.null()),
    isAnonymous: v.boolean(),
  }),
  isMine: v.boolean(),
  isPostAuthor: v.boolean(),
});

async function toCommentView(ctx: QueryCtx, comment: Doc<'prayerComments'>, prayer: Doc<'prayers'>, viewer: Doc<'users'> | null) {
  const imageUrl = !comment.isAnonymous && comment.authorImageId ? await ctx.storage.getUrl(comment.authorImageId) : null;
  return {
    _id: comment._id,
    content: comment.content,
    createdAt: comment.createdAt,
    author: {
      name: comment.isAnonymous ? ANONYMOUS_AUTHOR_NAME : comment.authorName,
      imageUrl,
      isAnonymous: comment.isAnonymous,
    },
    isMine: viewer?._id === comment.authorId,
    isPostAuthor: comment.authorId === prayer.authorId,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const createComment = mutation({
  args: { anonymousId: v.string(), prayerId: v.id('prayers'), content: v.string() },
  returns: v.id('prayerComments'),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.anonymousId);
    const prayer = await ctx.db.get('prayers', args.prayerId);
    if (!prayer || (prayer.isHidden && prayer.authorId !== user._id)) throw new Error('Publicação não encontrada.');

    // Keep paragraphs: only collapse spaces and tabs.
    const content = args.content.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    if (!content) throw new Error('Escreva um comentário.');
    if (content.length > PRAYER_LIMITS.comment) throw new Error(`O comentário pode ter até ${PRAYER_LIMITS.comment} caracteres.`);

    const now = Date.now();
    const recent = await ctx.db
      .query('prayerComments')
      .withIndex('by_authorId_and_createdAt', (q) => q.eq('authorId', user._id).gte('createdAt', now - DAY_MS))
      .take(PRAYER_LIMITS.dailyComments);
    if (recent.length >= PRAYER_LIMITS.dailyComments) {
      throw new Error('Você atingiu o limite de comentários de hoje. Tente novamente amanhã.');
    }

    const name = user.name?.trim();
    // No profile name, or the author of an anonymous post: the comment stays anonymous.
    const isAnonymous = !name || (prayer.authorId === user._id && prayer.isAnonymous);
    const displayName = isAnonymous ? ANONYMOUS_AUTHOR_NAME : name;

    const commentId = await ctx.db.insert('prayerComments', {
      prayerId: prayer._id,
      authorId: user._id,
      authorName: displayName,
      authorImageId: isAnonymous ? undefined : user.profileImageId,
      isAnonymous,
      content,
      reportCount: 0,
      isHidden: false,
      createdAt: now,
    });
    await ctx.db.patch('prayers', prayer._id, { commentCount: prayer.commentCount + 1 });

    await createNotification(ctx, {
      recipientId: prayer.authorId,
      actorId: user._id,
      type: 'comment',
      prayer,
      actorName: displayName,
      commentId,
      previewText: content.replace(/\s+/g, ' ').slice(0, PRAYER_LIMITS.notificationPreview),
    });
    return commentId;
  },
});

/** Comments of a post, oldest first. Hidden (reported) comments are left out. */
export const listComments = query({
  args: { anonymousId: v.optional(v.string()), prayerId: v.id('prayers'), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(commentViewValidator),
  handler: async (ctx, args) => {
    const viewer = args.anonymousId ? await findUser(ctx, args.anonymousId) : null;
    const prayer = await ctx.db.get('prayers', args.prayerId);
    if (!prayer || (prayer.isHidden && prayer.authorId !== viewer?._id)) {
      return { page: [], isDone: true, continueCursor: '' };
    }

    const result = await ctx.db
      .query('prayerComments')
      .withIndex('by_prayerId_and_isHidden_and_createdAt', (q) => q.eq('prayerId', prayer._id).eq('isHidden', false))
      .order('asc')
      .paginate(args.paginationOpts);

    return { ...result, page: await Promise.all(result.page.map((comment) => toCommentView(ctx, comment, prayer, viewer))) };
  },
});

/** The author of a comment, or the author of the post, can delete it. */
export const deleteComment = mutation({
  args: { anonymousId: v.string(), commentId: v.id('prayerComments') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.anonymousId);
    const comment = await ctx.db.get('prayerComments', args.commentId);
    if (!comment) return null;
    const prayer = await ctx.db.get('prayers', comment.prayerId);
    if (comment.authorId !== user._id && prayer?.authorId !== user._id) throw new Error('Comentário não encontrado.');

    const reports = await ctx.db
      .query('prayerCommentReports')
      .withIndex('by_commentId_and_userId', (q) => q.eq('commentId', comment._id))
      .take(REPORT_BATCH);
    for (const report of reports) await ctx.db.delete('prayerCommentReports', report._id);
    await ctx.db.delete('prayerComments', comment._id);

    // A hidden comment was already discounted when it was hidden.
    if (prayer && !comment.isHidden) {
      await ctx.db.patch('prayers', prayer._id, { commentCount: Math.max(0, prayer.commentCount - 1) });
    }
    return null;
  },
});

/** Reports someone else's comment; it is hidden after enough distinct reports. */
export const reportComment = mutation({
  args: { anonymousId: v.string(), commentId: v.id('prayerComments') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.anonymousId);
    const comment = await ctx.db.get('prayerComments', args.commentId);
    if (!comment || comment.isHidden) throw new Error('Comentário não encontrado.');
    if (comment.authorId === user._id) throw new Error('Você não pode denunciar o seu próprio comentário.');

    const already = await ctx.db
      .query('prayerCommentReports')
      .withIndex('by_commentId_and_userId', (q) => q.eq('commentId', comment._id).eq('userId', user._id))
      .unique();
    if (already) return null;

    await ctx.db.insert('prayerCommentReports', { commentId: comment._id, userId: user._id, createdAt: Date.now() });
    const reportCount = comment.reportCount + 1;
    const hide = reportCount >= PRAYER_LIMITS.reportsToHide;
    await ctx.db.patch('prayerComments', comment._id, { reportCount, isHidden: hide });

    if (hide) {
      const prayer = await ctx.db.get('prayers', comment.prayerId);
      if (prayer) await ctx.db.patch('prayers', prayer._id, { commentCount: Math.max(0, prayer.commentCount - 1) });
    }
    return null;
  },
});
