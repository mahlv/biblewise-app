# Backend Convex — Biblewise

Backend serverless: banco, queries, mutations e (em breve) actions com IA.

## Estrutura

| Arquivo | Papel |
| --- | --- |
| `schema.ts` | Tabelas e índices: `users`, `churches`, `books`, `verses`, `dailyPicks`, `counters`, `sermons`, `phrases`, `stories` |
| `bible.ts` | Queries de leitura: busca por referência, capítulo, versículo do dia, frase do dia, autocomplete |
| `users.ts` | Usuário anônimo do onboarding (`createAnonymousUser`, `getUserByAnonymousId`); vínculo com Clerk é TODO |
| `sermons.ts` | Fluxo de gravação de culto (interno) e queries públicas do feed |
| `seed.ts` | Carga inicial idempotente + usuário de teste + limpeza |
| `data/seedData.ts` | Dados das Escrituras usados no seed |
| `_generated/` | **Gerado pelo `convex dev`** — não editar à mão |

Leia `convex/_generated/ai/guidelines.md` antes de mexer aqui: são as regras
versionadas do Convex para esta versão, e elas vencem conhecimento de memória.

## Primeira execução

```bash
pnpm add convex
npx convex dev                              # login, cria o projeto, gera _generated/
npx convex run seed:popularBiblia           # 14 livros, 31 versículos, 31 destaques
npx convex run seed:criarUsuarioDeTeste     # usuário pastor para exercitar a escrita
```

Verificação end-to-end contra o deployment (usa a API HTTP, o mesmo caminho do app):

```bash
node scripts/verify-deployment.mjs
```

## Decisões de arquitetura

**Por que a busca por referência não usa full-text search.** O fiel digita
`João 3:16`, ou seja, uma referência — não uma frase para procurar no texto. O
parser em `lib/bibleReference.ts` converte a digitação em `livro + capítulo +
versículo`, e o índice `by_livro_and_capitulo_and_versiculo` resolve em uma única
leitura. Busca por palavra dentro do texto (search index do Convex) entra quando
houver uma tradução completa importada.

**Parser compartilhado entre app e backend.** `convex/bible.ts` importa
`../lib/bibleReference.ts` por caminho relativo. O bundler de funções do Convex
empacota esse arquivo junto, então o parsing é idêntico no cliente e no servidor,
sem risco de as duas implementações divergirem.

**Queries nunca leem o relógio.** `versiculoDoDia` e `fraseDoDia` recebem `data`
e `fusoMinutos` do cliente. Isso é exigência do Convex: queries não são
reexecutadas só porque o tempo passou, e ler `Date.now()` reduz o cache de
resultados. O fuso também vem do dispositivo, porque assumir Brasília estaria
errado para fiéis em outros fusos.

**Destaques pré-computados (`dailyPicks`).** Em vez de varrer `verses` e calcular
um índice na hora, o seed materializa uma lista fixa. A query faz uma leitura de
índice (`dia % total`), sem varredura e determinística.

**`counters` em vez de contar linhas.** O Convex não tem operador de contagem, e
`.collect().length` seria uma varredura ilimitada. O total de cultos do mês vive
em `counters`, atualizado na MESMA mutation que insere o sermão — é a regra para
dados espelhados, que impede contador e dados de divergirem.

**Escrita de sermão é `internalMutation`.** Ainda não há autenticação. Uma
mutation pública que aceita `autorId`/`aprovadoPor` como argumento deixaria
qualquer cliente se passar por um pastor e publicar um resumo. Enquanto não
existir sessão, a escrita fica acessível só de dentro do backend.

**Mutations separadas por etapa.** O fluxo é dividido em seis mutations
(`iniciarGravacao` → `anexarAudio` → ... → `aprovarResumo`). Se o app fechar ou
perder rede no meio, o estado parcial fica salvo e o fluxo pode ser retomado.

**Transcrição e resumo serão `action`, não `mutation`.** Chamadas ao Whisper e ao
LLM são efeitos externos não determinísticos; no Convex isso é `action`. As
mutations aqui só tocam o banco.

**Aprovação pastoral é um portão no servidor.** `aprovarResumo` valida o papel do
revisor e só então marca `publicado: true`. Nenhum resumo de IA aparece no app
sem revisão humana.

## Segurança e próximos passos

Antes de qualquer deploy de produção:

1. **Adicionar o Clerk** e criar `convex/auth.config.ts` — sem esse arquivo
   `ctx.auth.getUserIdentity()` sempre devolve `null`.
2. **Promover as mutations de sermão a públicas**, trocando os argumentos
   `autorId`/`aprovadoPor` por identidade derivada de `ctx.auth.getUserIdentity()`
   (gravada em `users.clerkId` no vínculo da conta), nunca por argumento do cliente.
3. **Rate limit em `users.createAnonymousUser`** — é pública e sem sessão.
4. **Proteger as mutations de seed**, hoje abertas de propósito para o setup local.
5. **Trocar a config do app para `ConvexProviderWithAuth`** — `ConvexProvider`
   puro não envia token, então as queries autenticadas falhariam.
6. **Tirar a transcrição do documento.** Hoje ela é um campo de `sermons`; um
   culto longo pode se aproximar do limite de 1MB por documento. O certo é mover
   para o File Storage e guardar o `Id<'_storage'>`.

## Testes rápidos (sem deployment)

```bash
pnpm test:smoke            # parser de referências + consistência do seed
node scripts/verify-deployment.mjs   # contra o deployment real
```
