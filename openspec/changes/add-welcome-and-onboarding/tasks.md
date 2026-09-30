# Tasks

## 1. Dependências e configuração

- [x] 1.1 Instalar com `pnpm expo install` as dependências do router, fontes, AsyncStorage, `expo-crypto`, `expo-linear-gradient` e `@expo/vector-icons`, respeitando `minimumReleaseAge` (`expo-router` fixado em `57.0.22`). **Verificar:** lockfile passa nas políticas de supply-chain.
- [x] 1.2 `main: expo-router/entry`; remover `index.ts` e `App.tsx`. **Verificar:** nada importa `./App` ou `registerRootComponent`.
- [x] 1.3 `app.json`: `scheme`, plugins `expo-router`/`expo-font`, `experiments.typedRoutes`.
- [x] 1.4 Correções da auditoria: `tsconfig` com `types: ["jest"]`; `jest`/`@types/jest` alinhados ao SDK 57; `babel-preset-expo` e `@types/react-test-renderer` declarados; `allowBuilds` sem placeholders; relógio da busca normalizado para o início do dia. **Verificar:** `pnpm typecheck` e `pnpm test` passam.

## 2. Design system

- [x] 2.1 `theme/tokens.ts` (cores, gradiente, fontes, raios, espaçamentos, sombra) e `theme/onboardingStyles.ts`.
- [x] 2.2 `components/PrimaryButton.tsx` (sólido, seta, `disabled`, `loading`).
- [x] 2.3 `components/ProgressBar.tsx` (gradiente, progresso 0–1).
- [x] 2.4 `components/OnboardingOption.tsx` (escolha única, ícone, sufixo, selo, variante `display`).
- [x] 2.5 `components/OnboardingHeader.tsx`, `BrandLogo.tsx`, `PrivacyNote.tsx`.

## 3. Backend (Convex)

- [x] 3.1 Unificar `users` em `convex/schema.ts` com `anonymousId`, `clerkId?`, `ageRange?`, `denomination?`, `onboardingCompleted`, `createdAt`, `updatedAt` e índices `by_anonymous_id`/`by_clerk_id`; ajustar `sermons.ts` e `seed.ts`.
- [x] 3.2 `convex/users.ts`: `createAnonymousUser` (idempotente, valida UUID v4, recusa registro vinculado) e `getUserByAnonymousId`; TODO do vínculo com o Clerk. **Verificar:** `pnpm exec tsc --noEmit -p convex` e `pnpm exec convex dev --once` no deployment de dev.

## 4. Estado e persistência

- [x] 4.1 `lib/onboardingOptions.ts` com as listas e tipos compartilhados entre app e backend.
- [x] 4.2 `lib/onboardingStorage.ts` (leitura tolerante, `getOrCreateAnonymousId` com `Crypto.randomUUID()`, marca de conclusão).
- [x] 4.3 `hooks/useOnboarding.tsx` (rascunho entre etapas, `complete` grava no Convex antes da marca local, `reset`).
- [x] 4.4 Testes de `lib/onboardingStorage.ts` (ausente, corrompido, UUID reaproveitado, marca). **Verificar:** `pnpm test`.

## 5. Rotas e telas

- [x] 5.1 `app/_layout.tsx` (providers, fontes, splash, `Stack.Protected`) e `app/index.tsx` (redirect).
- [x] 5.2 `app/(onboarding)/_layout.tsx`, `welcome.tsx`, `age.tsx`, `denomination.tsx`.
- [x] 5.3 `app/(tabs)/_layout.tsx` e `home.tsx` (placeholder, "Refazer onboarding", busca embutida).
- [x] 5.4 **Verificar:** `pnpm expo export --platform android` gera o bundle sem erro.

## 6. Verificação final

- [x] 6.1 `pnpm typecheck`, `tsc -p convex`, `pnpm test`, `pnpm lint` e `expo-doctor` (apenas o patch mismatch conhecido do `expo-router`).
- [ ] 6.2 No dispositivo: primeira abertura → boas-vindas → idade → denominação → Home; fechar e reabrir vai direto para a Home; conferir o documento em `users` no dashboard do Convex.
- [ ] 6.3 "Refazer onboarding" volta às boas-vindas e, ao concluir de novo, atualiza o mesmo documento (sem duplicar).
- [ ] 6.4 Busca por "João 3:16" continua funcionando na Home.
- [ ] 6.5 Testes de componente/rota do guard (primeira abertura vs. concluído) com o harness do cliente Convex falso.
