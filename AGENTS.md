This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Requires **Node `^22.13.0`** (or `^20.19.4` / `^24.3.0`), the range declared by `react-native@0.86`. On older Node 22 releases `jest` crashes at startup with `ERR_REQUIRE_ESM` (chalk@5); `NODE_OPTIONS=--experimental-require-module` is only a temporary workaround.

This project uses **pnpm** (`pnpm-lock.yaml`). Prefix Expo commands with `pnpm` (e.g. `pnpm expo install`).

```bash
pnpm expo install <package>  # ALWAYS use instead of pnpm add — resolves SDK-compatible versions
pnpm start                   # start the dev server
pnpm lint                    # lint (expo lint)
pnpm typecheck               # typecheck the app (tsc --noEmit)
pnpm exec tsc --noEmit -p convex   # typecheck the Convex backend
pnpm test                    # jest (jest-expo/ios preset, tests in test/)
pnpm dlx expo-doctor@latest  # diagnose dependency and config issues
pnpm expo install --fix      # fix incompatible package versions
pnpm exec convex dev --once  # push functions/schema to the DEV deployment + regenerate convex/_generated
```

Run lint, typecheck (app + convex) and tests before declaring any task done.

pnpm supply-chain policy: `pnpm-workspace.yaml` enforces `minimumReleaseAge` and `allowBuilds`. Never add entries to `minimumReleaseAgeExclude` or flip `allowBuilds` to work around an install failure — pin an older, mature version instead or ask the user. (`expo-router` is pinned to `57.0.22` for this reason; `expo-doctor` reports it as a patch mismatch.)

## Language conventions

- **English for ALL code**: files, folders, components, functions, variables, style keys, types, routes, Convex tables/fields/enum values, comments, test names and developer-facing error messages.
- **Portuguese for user-facing strings only**: labels, buttons, titles, placeholders, accessibility labels, error messages shown on screen.
- Legacy code written before this rule (`convex/bible.ts`, `convex/sermons.ts`, `convex/seed.ts`, the non-`users` tables in `convex/schema.ts`, `screens/`, `components/VerseCard.tsx`, `lib/bibleReference.ts`, `test/BibleSearchScreen.test.tsx`) still uses Portuguese identifiers and is pending migration. Renaming its Convex fields requires wiping/reseeding or migrating the existing data.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `app/` at the repo root (the repo is flat: `components/`, `hooks/`, `lib/`, `theme/`, `screens/`, `convex/`) — every file in `app/` is a screen, `_layout.tsx` files define navigators. Keep non-route code outside `app/`.
- Route groups: `(onboarding)` (welcome → age → denomination) and `(tabs)` (main area, `/home`). The root `app/_layout.tsx` guards them with `Stack.Protected` based on the onboarding flag in AsyncStorage (`hooks/useOnboarding.tsx`); `app/index.tsx` redirects.
- Design tokens live in `theme/tokens.ts`; fonts (EB Garamond / Plus Jakarta Sans) are loaded in `app/_layout.tsx` — use `fonts.*` family names, not `fontWeight`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
