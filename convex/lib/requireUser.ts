import type { Doc } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import { appError } from '../../lib/serverErrors';

type Ctx = QueryCtx | MutationCtx;

/**
 * Finds the onboarded user that owns this device `anonymousId`, or `null`.
 * The app has no login yet: the device id acts as the credential (same model as recordings).
 * TODO(clerk): derive the user from `ctx.auth` instead of the client-supplied id.
 */
export async function findUser(ctx: Ctx, anonymousId: string): Promise<Doc<'users'> | null> {
  const user = await ctx.db
    .query('users')
    .withIndex('by_anonymous_id', (q) => q.eq('anonymousId', anonymousId))
    .unique();
  return user && user.onboardingCompleted ? user : null;
}

/** Like `findUser`, but throws when the user does not exist. */
export async function requireUser(ctx: Ctx, anonymousId: string): Promise<Doc<'users'>> {
  const user = await findUser(ctx, anonymousId);
  if (!user) throw appError('userNotFound');
  return user;
}
