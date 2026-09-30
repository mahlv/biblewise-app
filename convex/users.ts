import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { ageRangeValidator, denominationValidator } from './schema';

/**
 * Anonymous users (anonymous-first).
 *
 * The app generates a UUID on the device (`anonymousId`) and keeps it in
 * AsyncStorage. That UUID acts as a device secret: whoever knows it can read
 * and update that record's onboarding choices. Therefore:
 *  - a UUID v4 format is required (122 random bits — not guessable);
 *  - the query returns onboarding fields only, never account data;
 *  - records already linked to Clerk no longer accept anonymous writes.
 *
 * TODO(clerk): once Clerk is added, create `linkClerkAccount` as an
 * authenticated mutation: read `ctx.auth.getUserIdentity()`, find the document
 * via `by_anonymous_id` and set `clerkId = identity.subject` (never accept
 * `clerkId` as a client argument). If a document with that `clerkId` already
 * exists (login on another device), merge into it instead of duplicating.
 *
 * TODO(abuse): this mutation is public and session-less; add rate limiting
 * (e.g. the `@convex-dev/rate-limiter` component) before production.
 */

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Creates (or updates, if it already exists) the anonymous record when
 * onboarding is completed.
 *
 * Idempotent per `anonymousId`: redoing onboarding on the same device updates
 * the choices instead of creating a second user.
 */
export const createAnonymousUser = mutation({
  args: {
    anonymousId: v.string(),
    ageRange: ageRangeValidator,
    denomination: denominationValidator,
  },
  returns: v.object({ userId: v.id('users'), created: v.boolean() }),
  handler: async (ctx, args) => {
    if (!UUID_V4.test(args.anonymousId)) {
      throw new Error('Invalid anonymousId: expected a UUID v4.');
    }

    const now = Date.now();
    const existing = await ctx.db
      .query('users')
      .withIndex('by_anonymous_id', (q) => q.eq('anonymousId', args.anonymousId))
      .unique();

    if (existing) {
      // Linked account: from here on only the authenticated session may change the profile.
      if (existing.clerkId) {
        throw new Error('This user is already linked to an account. Sign in to update the profile.');
      }

      await ctx.db.patch('users', existing._id, {
        ageRange: args.ageRange,
        denomination: args.denomination,
        onboardingCompleted: true,
        updatedAt: now,
      });
      return { userId: existing._id, created: false };
    }

    const userId = await ctx.db.insert('users', {
      anonymousId: args.anonymousId,
      ageRange: args.ageRange,
      denomination: args.denomination,
      onboardingCompleted: true,
      createdAt: now,
      updatedAt: now,
    });
    return { userId, created: true };
  },
});

/** Onboarding choices of an anonymous user (or `null` if it does not exist). */
export const getUserByAnonymousId = query({
  args: { anonymousId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id('users'),
      ageRange: v.union(ageRangeValidator, v.null()),
      denomination: v.union(denominationValidator, v.null()),
      onboardingCompleted: v.boolean(),
      createdAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_anonymous_id', (q) => q.eq('anonymousId', args.anonymousId))
      .unique();

    if (!user) return null;

    return {
      _id: user._id,
      ageRange: user.ageRange ?? null,
      denomination: user.denomination ?? null,
      onboardingCompleted: user.onboardingCompleted,
      createdAt: user.createdAt,
    };
  },
});
