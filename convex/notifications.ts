import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { internalMutation, mutation, query } from './_generated/server';
import type { MutationCtx } from './_generated/server';
import { findUser, requireUser } from './lib/requireUser';
import { prayerTypeValidator } from './schema';
import { PRAYER_LIMITS } from '../lib/prayerCategories';

/**
 * In-app notifications (the bell): someone liked or commented on your post.
 * A user only ever sees their own notifications; the actor's id is never stored or returned.
 * TODO(clerk): derive the user from `ctx.auth`.
 */

const MARK_BATCH = 100;

const notificationViewValidator = v.object({
  _id: v.id('notifications'),
  type: v.union(v.literal('like'), v.literal('comment')),
  prayerId: v.id('prayers'),
  prayerType: prayerTypeValidator,
  prayerTitle: v.string(),
  actorName: v.string(),
  previewText: v.optional(v.string()),
  isRead: v.boolean(),
  createdAt: v.number(),
});

export const listNotifications = query({
  args: { anonymousId: v.string(), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(notificationViewValidator),
  handler: async (ctx, args) => {
    const user = await findUser(ctx, args.anonymousId);
    if (!user) return { page: [], isDone: true, continueCursor: '' };

    const result = await ctx.db
      .query('notifications')
      .withIndex('by_recipientId_and_createdAt', (q) => q.eq('recipientId', user._id))
      .order('desc')
      .paginate(args.paginationOpts);

    return {
      ...result,
      page: result.page.map((item) => ({
        _id: item._id,
        type: item.type,
        prayerId: item.prayerId,
        prayerType: item.prayerType,
        prayerTitle: item.prayerTitle,
        actorName: item.actorName,
        previewText: item.previewText,
        isRead: item.isRead,
        createdAt: item.createdAt,
      })),
    };
  },
});

/** Unread notifications for the bell badge, counted up to the cap ("99+"). */
export const getUnreadCount = query({
  args: { anonymousId: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const user = await findUser(ctx, args.anonymousId);
    if (!user) return 0;
    const unread = await ctx.db
      .query('notifications')
      .withIndex('by_recipientId_and_isRead', (q) => q.eq('recipientId', user._id).eq('isRead', false))
      .take(PRAYER_LIMITS.unreadCap);
    return unread.length;
  },
});

export const markNotificationRead = mutation({
  args: { anonymousId: v.string(), notificationId: v.id('notifications') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.anonymousId);
    const notification = await ctx.db.get('notifications', args.notificationId);
    if (!notification || notification.recipientId !== user._id) throw new Error('Notificação não encontrada.');
    if (!notification.isRead) await ctx.db.patch('notifications', notification._id, { isRead: true });
    return null;
  },
});

/** Marks a batch as read and continues in the background while unread ones remain. */
async function markBatchRead(ctx: MutationCtx, recipientId: Id<'users'>): Promise<void> {
  const unread = await ctx.db
    .query('notifications')
    .withIndex('by_recipientId_and_isRead', (q) => q.eq('recipientId', recipientId).eq('isRead', false))
    .take(MARK_BATCH);
  for (const notification of unread) await ctx.db.patch('notifications', notification._id, { isRead: true });
  if (unread.length === MARK_BATCH) {
    await ctx.scheduler.runAfter(0, internal.notifications.markRestRead, { recipientId });
  }
}

export const markAllNotificationsRead = mutation({
  args: { anonymousId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.anonymousId);
    await markBatchRead(ctx, user._id);
    return null;
  },
});

export const markRestRead = internalMutation({
  args: { recipientId: v.id('users') },
  returns: v.null(),
  handler: async (ctx, args) => {
    await markBatchRead(ctx, args.recipientId);
    return null;
  },
});
