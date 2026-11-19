import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';

interface NotificationInput {
  recipientId: Id<'users'>;
  /** Who acted; used only to skip self-notifications and to build `dedupeKey`, never stored. */
  actorId: Id<'users'>;
  type: Doc<'notifications'>['type'];
  prayer: Doc<'prayers'>;
  actorName: string;
  commentId?: Id<'prayerComments'>;
  previewText?: string;
  /** When set, only one notification with this key is ever created. */
  dedupeKey?: string;
}

/**
 * Creates an in-app notification. Skips the case where someone acts on their own post and,
 * when a `dedupeKey` is given, the case where that notification already exists.
 */
export async function createNotification(ctx: MutationCtx, input: NotificationInput): Promise<void> {
  if (input.recipientId === input.actorId) return;

  if (input.dedupeKey) {
    const existing = await ctx.db
      .query('notifications')
      .withIndex('by_dedupeKey', (q) => q.eq('dedupeKey', input.dedupeKey))
      .first();
    if (existing) return;
  }

  await ctx.db.insert('notifications', {
    recipientId: input.recipientId,
    type: input.type,
    prayerId: input.prayer._id,
    prayerType: input.prayer.type,
    prayerTitle: input.prayer.title,
    commentId: input.commentId,
    actorName: input.actorName,
    previewText: input.previewText,
    isRead: false,
    dedupeKey: input.dedupeKey,
    createdAt: Date.now(),
  });
}
