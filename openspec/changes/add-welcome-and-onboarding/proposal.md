# Proposal

## Why

O app hoje abre direto numa tela de busca de versículos (`screens/BibleSearchScreen.tsx` ligada ao `App.tsx`), sem porta de entrada, sem identidade visual e sem nenhuma informação sobre quem é o fiel. Sem capturar faixa etária e denominação, não é possível personalizar versões bíblicas, planos de leitura ou trilhas de conteúdo — que é justamente a proposta do produto e a base do modelo freemium/Igreja.

Esta é a primeira mudança de UI do BibleWise e estabelece três fundações que as telas seguintes vão reutilizar: o sistema de navegação (Expo Router), o design system extraído das telas de referência e a identidade anônima do fiel (anonymous-first), já preparada para o vínculo futuro com o Clerk.

## What Changes

- **BREAKING**: a rota raiz deixa de ser `App.tsx` renderizando a busca direto. `App.tsx` e `index.ts` são substituídos pelo entry point do Expo Router (`app/_layout.tsx`, `main: expo-router/entry`).
- Adiciona a **tela de Boas-Vindas** (`(onboarding)/welcome`) com logo, selo "DEVOCIONAL DIÁRIO & APRENDIZADO", área de hero (placeholder de gradiente), prova social e os três benefícios (Leia / Escute / Escreva).
- Adiciona o **onboarding em duas etapas**: faixa etária (`(onboarding)/age`) e denominação (`(onboarding)/denomination`), com barra de progresso ("1/2" e "ETAPA 2 DE 2 · 100%").
- Adiciona o **registro de usuário anônimo no Convex**: ao concluir, a mutation `users.createAnonymousUser` grava `anonymousId` (UUID v4 do dispositivo), faixa etária, denominação, `onboardingCompleted` e timestamps. Idempotente por `anonymousId`.
- **BREAKING (schema)**: a tabela `users` é unificada — ganha `anonymousId`, `clerkId?`, `ageRange?`, `denomination?`, `onboardingCompleted`, `createdAt`, `updatedAt` e os índices `by_anonymous_id` / `by_clerk_id`; `tokenIdentifier` e `criadoEm` saem; `nome`, `papel`, `plano` e `igrejaId` viram `name`, `role` (`member`/`pastor`/`church_admin`), `plan` (`free`/`premium`/`church`) e `churchId`, todos opcionais. A tabela estava vazia no deployment de dev.
- Adiciona **persistência local** (AsyncStorage) de `anonymousId` e da marca de conclusão.
- Adiciona **guard de rota** no layout raiz (`Stack.Protected`): quem concluiu vai para `/home`; quem não concluiu, para `/welcome`.
- Adiciona a **Home provisória** (`(tabs)/home`) com aviso "Home em construção", botão "Refazer onboarding" e a busca existente embutida.
- Adiciona um **design system** (`theme/tokens.ts`) e componentes reutilizáveis em `components/`.

## Capabilities

### New Capabilities

- `app-shell`: fundação de navegação e providers do app — Expo Router como raiz, `ConvexProvider` acima do navegador, fontes carregadas antes do primeiro paint e resolução da rota inicial pela marca de conclusão local.
- `onboarding`: fluxo de primeira execução — boas-vindas, faixa etária, denominação, progresso, registro anônimo no backend e persistência local da identidade.

### Modified Capabilities

Nenhuma. O projeto ainda não tem specs (a busca de versículos nunca foi especificada no OpenSpec).

## Impact

**Código**
- `App.tsx` e `index.ts` — removidos.
- `screens/BibleSearchScreen.tsx` — mantida, renderizada dentro da Home provisória; o relógio passa a ser normalizado para o início do dia.
- `convex/schema.ts`, `convex/sermons.ts`, `convex/seed.ts` — adaptados à tabela `users` unificada. Novo `convex/users.ts`.
- Novos: `app/**`, `components/{PrimaryButton,ProgressBar,OnboardingOption,OnboardingHeader,BrandLogo,PrivacyNote}.tsx`, `hooks/useOnboarding.tsx`, `lib/onboardingOptions.ts`, `lib/onboardingStorage.ts`, `theme/`.

**Configuração**
- `package.json` — `main: expo-router/entry`; `jest`/`@types/jest` alinhados ao SDK 57; `babel-preset-expo` declarado.
- `app.json` — `scheme: biblewise`, plugins `expo-router` e `expo-font`, `experiments.typedRoutes`.
- `tsconfig.json` — `types: ["jest"]` (TS 6 não carrega `@types` automaticamente) e tipos do router.

**Dependências novas**
- `expo-router` (fixado em `57.0.22` pela política `minimumReleaseAge`), `react-native-safe-area-context`, `react-native-screens`, `expo-linking`, `expo-constants`, `expo-font`, `@expo-google-fonts/eb-garamond`, `@expo-google-fonts/plus-jakarta-sans`, `@react-native-async-storage/async-storage`, `expo-crypto`, `expo-linear-gradient`, `@expo/vector-icons`.

**Fora de escopo (deliberadamente)**
- Clerk e o vínculo `anonymousId` → `clerkId` (apenas o schema está preparado).
- Home real, abas, seleção de tradução bíblica e planos de leitura.
- Arte final do hero (placeholder de gradiente).
