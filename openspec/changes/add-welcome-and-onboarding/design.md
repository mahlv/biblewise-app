# Design

## Context

Ver `proposal.md` para motivação. O estado anterior que condiciona as decisões:

- O app era uma árvore única: `index.ts` → `registerRootComponent(App)` → `App.tsx` → `<ConvexProvider>` → `<BibleSearchScreen>`. Não existia roteador.
- O `ConvexReactClient` já era criado no nível de módulo (correto: não recria a conexão a cada render).
- O projeto usa pnpm com `node_modules` estrito e política de supply-chain (`minimumReleaseAge`, `allowBuilds`). Todo pacote importado precisa estar em `package.json`.
- Já existia uma tabela `users` (com `tokenIdentifier`, `nome`, `papel`, `plano`) usada por `sermons.ts` e `seed.ts`, vazia no deployment de dev.
- Não há autenticação.

## Goals / Non-Goals

**Goals:**

- Árvore de rotas e design system reutilizáveis pelas próximas features.
- Fluxo anonymous-first: o fiel usa o app sem login, e o mesmo registro de usuário será vinculado ao Clerk no futuro, sem migração.
- Manter a busca funcionando sem reescrever sua lógica.
- Onboarding idempotente e resistente a dados locais corrompidos.

**Non-Goals:**

- Integrar o Clerk ou implementar o vínculo de conta.
- Home real, abas, tema escuro, seleção de tradução ou plano de leitura.
- Acessibilidade completa (há `accessibilityRole`/`State` básicos; auditoria AA fica para depois).

## Decisions

### Rotas em `app/`, não `src/app/`

O repositório é plano na raiz (`components/`, `hooks/`, `lib/`, `theme/`, `screens/`, `convex/`). `AGENTS.md` foi atualizado para refletir isso.

```
app/
  _layout.tsx               ConvexProvider + SafeArea + OnboardingProvider + fontes + Stack com guard
  index.tsx                 <Redirect> para /home ou /welcome
  (onboarding)/
    _layout.tsx             Stack sem cabeçalho
    welcome.tsx
    age.tsx
    denomination.tsx
  (tabs)/
    _layout.tsx             Stack (vira Tabs quando houver mais seções)
    home.tsx                Home provisória + busca
```

A Home é `(tabs)/home.tsx` (URL `/home`) e não `(tabs)/index.tsx`, porque esta última colidiria com `app/index.tsx` na rota `/`.

### Guard com `Stack.Protected` no layout raiz

O layout raiz só renderiza o `Stack` depois de fontes e marca local estarem prontas (a splash nativa fica visível até lá via `SplashScreen.preventAutoHideAsync`). `(onboarding)` fica sob `guard={!completed}` e `(tabs)` sob `guard={completed}`. Quando `completed` muda — concluir ou refazer o onboarding — o router sai da tela que deixou de ser permitida e volta ao `index`, que redireciona. Assim nenhuma tela chama `router.replace` depois de concluir, e o onboarding não fica no histórico.

**Alternativa considerada:** `Redirect` dentro de cada tela. Rejeitada porque permite uma tela protegida aparecer por um frame.

### Usuário anônimo no Convex, tabela `users` unificada

Um documento por pessoa, do uso anônimo até a conta. `anonymousId` é obrigatório; `clerkId`, perfil (`name`, `email`) e conta (`role`, `plan`, `churchId`) são opcionais. Ausência de `role` equivale a `member` e de `plan` a `free` (`sermons.ts` trata isso). O vínculo futuro é só gravar `clerkId` no mesmo documento.

### Convenção de idioma

Todo o código novo (arquivos, componentes, funções, variáveis, chaves de estilo, tipos, rotas, campos e valores enum do Convex, comentários) é em inglês; apenas textos exibidos ao fiel ficam em português. Por isso os valores de denominação são `catholic`, `evangelical`, `protestant`, `pentecostal`, `non_denominational`, `orthodox` e `other`, com rótulos em `DENOMINATION_LABELS`. O código legado (busca, sermões, seed e demais tabelas) ainda usa identificadores em português e será migrado em outra mudança, porque renomear seus campos exige reseed ou migração dos dados existentes.

**Alternativa considerada:** tabela separada para perfis anônimos. Rejeitada porque exigiria mesclar dois registros no login.

**Segurança:** `createAnonymousUser` é pública e sem sessão. O `anonymousId` funciona como segredo do dispositivo:
- exige formato UUID v4;
- valida faixa etária e denominação com uniões de literais compartilhadas (`lib/onboardingOptions.ts`) entre app e backend;
- é idempotente por `anonymousId` (refazer atualiza o mesmo documento);
- recusa escrita anônima em registro que já tenha `clerkId`;
- `getUserByAnonymousId` devolve só os campos do onboarding.

Falta rate limit contra criação em massa (TODO no código, antes de produção).

**Dado sensível (LGPD):** denominação é convicção religiosa, dado pessoal sensível (art. 5º, II). O texto de consentimento/privacidade precisa ser revisado antes de produção.

### Persistência local: só identidade e conclusão

AsyncStorage guarda `@biblewise/anonymousId` e `@biblewise/onboardingCompleted`. As escolhas vivem no Convex. A marca de conclusão é gravada **somente depois** da confirmação do backend, para que "concluído" no dispositivo implique registro existente no servidor. Leitura tolerante: qualquer valor diferente da string `"true"` é "não concluído". "Refazer onboarding" limpa só a marca e mantém o `anonymousId`.

O rascunho das escolhas (entre as etapas) fica em memória num contexto React (`hooks/useOnboarding.tsx`); voltar da etapa 2 preserva a faixa etária.

### Tokens em `theme/tokens.ts`

| Papel | Valor |
| --- | --- |
| `primary` | `#B90039` |
| `secondary` | `#0051D4` |
| `tertiary` | `#376725` |
| `background` | `#FFF8F6` |
| `surfaceContainerLowest` | `#FFFFFF` |
| `onSurface` | `#3A0A00` |
| `onSurfaceVariant` | `#5C3F41` |
| `outline` | `#906F70` |
| Gradiente da marca (135°) | `#EF2D56` → `#F7F052` → `#0051D4` |

Raios de 12 a 32 px. Tipografia: EB Garamond (títulos) e Plus Jakarta Sans (corpo), carregadas por subpath dos pacotes `@expo-google-fonts/*` para empacotar só os pesos usados. Se a fonte falhar, o app segue com a tipografia do sistema.

**Botão principal sólido (`primary`), não gradiente:** o amarelo do meio do gradiente deixaria o texto branco sem contraste. O gradiente fica na barra de progresso e em destaques decorativos.

### Componentes compartilhados

`PrimaryButton`, `ProgressBar`, `OnboardingOption` (cartão de escolha única, variantes `default`/`display`, ícone e selo opcionais), `OnboardingHeader` (voltar | logo | contador), `BrandLogo` e `PrivacyNote`. Ícones via `@expo/vector-icons` (MaterialCommunityIcons).

## Risks / Trade-offs

| Risco | Mitigação |
| --- | --- |
| Mover `App.tsx` para o Expo Router é breaking | `main` alterado junto; `expo export --platform android` valida o bundle |
| `expo-router@57.0.24` foi publicado há menos que o `minimumReleaseAge` | Fixado em `57.0.22`; `expo-doctor` reporta patch mismatch, aceito. Atualizar quando a versão amadurecer |
| Mutation pública sem sessão pode ser usada para criar registros em massa | Validação de UUID e literais; rate limit pendente antes de produção |
| Offline, a mutation fica na fila do Convex e o botão continua carregando | Aceito nesta etapa; o fiel pode fechar e retomar. Avaliar modo offline-first depois |
| Prova social ("Top #1", "4,8", "+10 mi") exibida sem dados reais | Mantida por decisão de produto; revisar antes da publicação nas lojas |
| Denominação é dado sensível | Revisar consentimento/termos antes de produção |

## Migration Plan

1. Instalar as dependências com `pnpm expo install`, respeitando a política de supply-chain.
2. Ajustar `main`, `app.json` e `tsconfig`; remover `App.tsx`/`index.ts`.
3. Unificar `users` e enviar ao deployment de **dev** com `convex dev --once` (tabela vazia, sem backfill).
4. Criar tokens, componentes, contexto, rotas e telas.

**Rollback:** `git revert`. No Convex, reverter o schema exige que a tabela `users` não tenha documentos no formato novo (apagar os anônimos de teste antes).

## Open Questions

- Arte final do hero (há uma aquarela em `assets/`, ainda não adotada).
- Quando a área principal ganha abas (Hoje, Bíblia, Histórias, Perfil).
- Texto definitivo de privacidade/consentimento para o dado de denominação.
