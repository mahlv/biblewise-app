import { v } from 'convex/values';
import type { Doc } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { ageRangeValidator, denominationValidator } from './schema';

/**
 * Anonymous users (anonymous-first).
 *
 * The app generates a UUID on the device (`anonymousId`) and keeps it in
 * AsyncStorage. That UUID acts as a device secret: whoever knows it can read
 * and update that record's onboarding choices. Therefore:
 *  - a UUID v4 format is required (122 random bits — not guessable);
 *  - the query returns onboarding and profile fields only, never account data
 *    (`clerkId`, `role`, `plan`);
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

/** Onboarding choices and editable profile of an anonymous user (or `null` if it does not exist). */
export const getUserByAnonymousId = query({
  args: { anonymousId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id('users'),
      ageRange: v.union(ageRangeValidator, v.null()),
      denomination: v.union(denominationValidator, v.null()),
      name: v.union(v.string(), v.null()),
      email: v.union(v.string(), v.null()),
      country: v.union(v.string(), v.null()),
      city: v.union(v.string(), v.null()),
      churchName: v.union(v.string(), v.null()),
      /** Resolved server-side so clients never need a public storageId -> URL lookup. */
      profileImageUrl: v.union(v.string(), v.null()),
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
      name: user.name ?? null,
      email: user.email ?? null,
      country: user.country ?? null,
      city: user.city ?? null,
      churchName: user.churchName ?? null,
      profileImageUrl: user.profileImageId ? await ctx.storage.getUrl(user.profileImageId) : null,
      onboardingCompleted: user.onboardingCompleted,
      createdAt: user.createdAt,
    };
  },
});

// ---------------------------------------------------------------------------
// Profile editing
// ---------------------------------------------------------------------------

const MAX_NAME_LENGTH = 80;
const MAX_FIELD_LENGTH = 120;
const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Finds the editable (not Clerk-linked) user of this device, or throws. */
async function requireEditableUser(ctx: QueryCtx | MutationCtx, anonymousId: string): Promise<Doc<'users'>> {
  const user = await ctx.db
    .query('users')
    .withIndex('by_anonymous_id', (q) => q.eq('anonymousId', anonymousId))
    .unique();
  if (!user || !user.onboardingCompleted) throw new Error('Usuário não encontrado.');
  if (user.clerkId) throw new Error('Entre na sua conta para editar o perfil.');
  return user;
}

/** Trims and caps a text field; an empty string clears it (`undefined` removes it on patch). */
function cleanText(value: string, maxLength: number): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

export const generateProfileImageUploadUrl = mutation({
  args: { anonymousId: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    await requireEditableUser(ctx, args.anonymousId);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Updates the editable profile fields. A missing argument leaves the field
 * untouched; an empty string clears it.
 */
export const updateUserProfile = mutation({
  args: {
    anonymousId: v.string(),
    name: v.optional(v.string()),
    ageRange: v.optional(ageRangeValidator),
    email: v.optional(v.string()),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    churchName: v.optional(v.string()),
    profileImageId: v.optional(v.id('_storage')),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireEditableUser(ctx, args.anonymousId);

    const patch: Partial<Doc<'users'>> = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = cleanText(args.name, MAX_NAME_LENGTH);
    if (args.ageRange !== undefined) patch.ageRange = args.ageRange;
    if (args.email !== undefined) {
      const email = cleanText(args.email, MAX_FIELD_LENGTH);
      if (email && !EMAIL_FORMAT.test(email)) throw new Error('E-mail inválido.');
      patch.email = email;
    }
    if (args.country !== undefined) patch.country = cleanText(args.country, MAX_FIELD_LENGTH);
    if (args.city !== undefined) patch.city = cleanText(args.city, MAX_FIELD_LENGTH);
    if (args.churchName !== undefined) patch.churchName = cleanText(args.churchName, MAX_FIELD_LENGTH);

    if (args.profileImageId !== undefined && args.profileImageId !== user.profileImageId) {
      const file = await ctx.db.system.get('_storage', args.profileImageId);
      if (!file) throw new Error('Imagem não encontrada.');
      if (!file.contentType?.startsWith('image/') || file.size > MAX_PROFILE_IMAGE_BYTES) {
        await ctx.storage.delete(args.profileImageId);
        throw new Error('Escolha uma imagem de até 5 MB.');
      }
      if (user.profileImageId) await ctx.storage.delete(user.profileImageId);
      patch.profileImageId = args.profileImageId;
    }

    await ctx.db.patch('users', user._id, patch);
    return null;
  },
});
