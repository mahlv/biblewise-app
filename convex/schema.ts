import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { AGE_RANGES, DENOMINATIONS } from '../lib/onboardingOptions';
import { PRAYER_CATEGORIES, PRAYER_TYPES } from '../lib/prayerCategories';

/** Accepted age ranges — the same list shown in onboarding. */
export const ageRangeValidator = v.union(...AGE_RANGES.map((ageRange) => v.literal(ageRange)));
/** Accepted denominations — the same list shown in onboarding. */
export const denominationValidator = v.union(
  ...DENOMINATIONS.map((denomination) => v.literal(denomination)),
);

/** Prayer wall: request or testimony, and its category (same lists the form offers). */
export const prayerTypeValidator = v.union(...PRAYER_TYPES.map((type) => v.literal(type)));
export const prayerCategoryValidator = v.union(...PRAYER_CATEGORIES.map((category) => v.literal(category)));

/** Meeting types selectable in the processing sheet. */
export const MEETING_TYPES = ['celebration', 'bible_school', 'youth_service', 'prayer'] as const;

/** AI summary of a recorded message. */
export const recordingSummaryValidator = v.object({
  title: v.string(),
  theme: v.string(),
  centralPoints: v.array(v.object({ title: v.string(), description: v.string() })),
  scripturesCited: v.array(v.object({ reference: v.string(), text: v.string() })),
  practicalTopics: v.array(v.string()),
  impactQuote: v.string(),
});

export const recordingStatusValidator = v.union(
  v.literal('uploading'),
  v.literal('transcribing'),
  v.literal('summarizing'),
  v.literal('completed'),
  v.literal('failed'),
);

/**
 * Esquema do banco do Biblewise.
 *
 * Convenções adotadas (seguindo convex/_generated/ai/guidelines.md):
 *  - Nomes de índice no padrão `by_<campo1>_and_<campo2>`, listando todos os
 *    campos do índice. Índices são declarados por CAMINHO DE LEITURA: cada
 *    query precisa de um índice que cubra seus filtros, senão vira table scan.
 *  - `_creationTime` NÃO entra em índice customizado (é reservado, e o Convex
 *    já o anexa como última coluna de todo índice).
 *  - Campos opcionais (`v.optional`) representam etapas ainda não preenchidas do
 *    fluxo (ex.: sermão gravado mas ainda não transcrito).
 *  - Listas que crescem sem limite NÃO ficam como array dentro de documento:
 *    viraram tabelas próprias com chave estrangeira (`verses`, `contadores`).
 */
export default defineSchema({
  // ---------------------------------------------------------------------------
  // Users (members, pastors and church admins)
  // ---------------------------------------------------------------------------
  /**
   * One document per person, from the first anonymous use to the Clerk account.
   *
   * Anonymous-first flow: onboarding creates the document with only an
   * `anonymousId` (UUID generated on the device). When the user signs in, the
   * same document receives `clerkId` — nothing is migrated or duplicated. That
   * is why profile/account fields (`name`, `role`, `plan`...) are optional: they
   * do not exist for anonymous users. Missing `role` = `member`; missing
   * `plan` = `free`.
   */
  users: defineTable({
    /** UUID generated on the device and stored in AsyncStorage. */
    anonymousId: v.string(),
    /** Clerk user id; set when the account is linked (future step). */
    clerkId: v.optional(v.string()),
    ageRange: v.optional(ageRangeValidator),
    denomination: v.optional(denominationValidator),
    onboardingCompleted: v.boolean(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    /** Free-text church name (distinct from the `churchId` relation). */
    churchName: v.optional(v.string()),
    /** Avatar in Convex File Storage (Id, never the URL). */
    profileImageId: v.optional(v.id('_storage')),
    /** In-app permissions; missing means `member`. */
    role: v.optional(
      v.union(v.literal('member'), v.literal('pastor'), v.literal('church_admin')),
    ),
    /** Subscription plan; missing means `free`. */
    plan: v.optional(
      v.union(v.literal('free'), v.literal('premium'), v.literal('church')),
    ),
    /** Linked church (required for pastors on the Church plan). */
    churchId: v.optional(v.id('churches')),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_anonymous_id', ['anonymousId'])
    .index('by_clerk_id', ['clerkId'])
    .index('by_church_id', ['churchId']),

  // ---------------------------------------------------------------------------
  // Igrejas (plano Igreja / white-label)
  // ---------------------------------------------------------------------------
  churches: defineTable({
    nome: v.string(),
    /** Slug usado no painel pastoral e na publicação oficial. */
    slug: v.string(),
    cidade: v.optional(v.string()),
    criadoEm: v.number(),
  }).index('by_slug', ['slug']),

  // ---------------------------------------------------------------------------
  // Bíblia: livros e versículos (dados públicos, somente leitura no app)
  // ---------------------------------------------------------------------------
  books: defineTable({
    /** Ordem canônica de 1 (Gênesis) a 66 (Apocalipse). */
    ordem: v.number(),
    nome: v.string(),
    abreviacao: v.string(),
    testamento: v.union(v.literal('AT'), v.literal('NT')),
    /** Quantidade de capítulos, útil para validar a busca. */
    totalCapitulos: v.number(),
  }).index('by_ordem', ['ordem']),

  verses: defineTable({
    /** Referência ao livro (permite trocar de tradução no futuro). */
    bookId: v.id('books'),
    /** Ordem canônica desnormalizada: evita um join só para ordenar. */
    bookOrdem: v.number(),
    livro: v.string(),
    testamento: v.union(v.literal('AT'), v.literal('NT')),
    capitulo: v.number(),
    versiculo: v.number(),
    texto: v.string(),
    /** Sigla da tradução, ex.: "ARC", "NVI", "ARA". */
    traducao: v.string(),
    /** URL do áudio narrado (opcional — recurso "ouvir o versículo"). */
    audioUrl: v.optional(v.string()),
  })
    // Busca exata por referência: "João 3:16" -> 1 leitura de índice.
    .index('by_livro_and_capitulo_and_versiculo', ['livro', 'capitulo', 'versiculo'])
    // Listagem de um capítulo inteiro, já na ordem dos versículos.
    .index('by_bookId_and_capitulo_and_versiculo', ['bookId', 'capitulo', 'versiculo'])
    // Range scan por ordem canônica (usado pelo seed e por listagens).
    .index('by_bookOrdem_and_capitulo_and_versiculo', [
      'bookOrdem',
      'capitulo',
      'versiculo',
    ]),

  // ---------------------------------------------------------------------------
  // Destaques do dia — pré-computados no seed
  // ---------------------------------------------------------------------------
  /**
   * Alimenta o "versículo do dia" e a "frase do dia" do widget.
   *
   * Em vez de varrer `verses` e calcular um índice na hora, o seed materializa
   * uma lista pequena e fixa de destaques. A query então faz UMA leitura de
   * índice (`ordem == dia % total`), sem varredura e sem `Date.now()` no
   * servidor — o app envia a data como argumento.
   */
  dailyPicks: defineTable({
    /** Posição na rotação (0..N-1), atribuída pelo seed. */
    ordem: v.number(),
    /** Referência legível, ex.: "Salmos 23:1". */
    referencia: v.string(),
    texto: v.string(),
    livro: v.string(),
    capitulo: v.number(),
    versiculo: v.number(),
    traducao: v.string(),
    /** Versículo de origem, quando o destaque vier de `verses`. */
    verseId: v.optional(v.id('verses')),
    /** Frase curta pronta para virar imagem de compartilhamento. */
    frase: v.string(),
  }).index('by_ordem', ['ordem']),

  // ---------------------------------------------------------------------------
  // Contadores denormalizados (freemium e limites de plano)
  // ---------------------------------------------------------------------------
  /**
   * Contadores mantidos em mutation, na mesma transação da escrita que contam.
   *
   * O Convex não tem operador de contagem: `query.collect().length` seria uma
   * varredura ilimitada. Guardar o total aqui transforma a checagem de limite
   * do plano em uma leitura de índice.
   */
  counters: defineTable({
    /** Chave lógica do contador, ex.: "sermoes:2026-09:<userId>". */
    chave: v.string(),
    valor: v.number(),
    atualizadoEm: v.number(),
  }).index('by_chave', ['chave']),

  // ---------------------------------------------------------------------------
  // Sermões / cultos gravados
  // ---------------------------------------------------------------------------
  sermons: defineTable({
    titulo: v.string(),
    /** Pastor ou pregador responsável pela mensagem. */
    pregador: v.string(),
    igrejaId: v.optional(v.id('churches')),
    /** Quem enviou a gravação, ligado à sessão autenticada. */
    autorId: v.optional(v.id('users')),
    /** Data em que o culto aconteceu (timestamp em ms). */
    dataCulto: v.number(),
    duracaoSegundos: v.optional(v.number()),
    /** Arquivo de áudio no Convex File Storage (guardamos o Id, nunca a URL). */
    audioStorageId: v.optional(v.id('_storage')),
    /**
     * Estado do processamento:
     *  rascunho -> gravando -> transcrevendo -> resumo_pronto -> aprovado
     */
    status: v.union(
      v.literal('rascunho'),
      v.literal('gravando'),
      v.literal('transcrevendo'),
      v.literal('resumo_pronto'),
      v.literal('aprovado'),
      v.literal('falhou'),
    ),
    /** Transcrição integral gerada pelo Whisper. */
    transcricao: v.optional(v.string()),
    /** Resumo estruturado revisado/aprovado pelo pastor. */
    resumo: v.optional(
      v.object({
        temaCentral: v.string(),
        versiculosCitados: v.array(v.string()),
        pontosPrincipais: v.array(v.string()),
        aplicacaoPratica: v.string(),
        /** Modelo de IA usado, para auditoria e reprocessamento. */
        modeloIa: v.optional(v.string()),
        geradoEm: v.number(),
      }),
    ),
    /** Pastor que aprovou a publicação do resumo. */
    aprovadoPor: v.optional(v.id('users')),
    aprovadoEm: v.optional(v.number()),
    /** Marca se o resumo já pode aparecer publicamente no app. */
    publicado: v.boolean(),
    criadoEm: v.number(),
  })
    // Feed público: filtra por publicado e ordena por data do culto.
    // Sem este índice, filtrar `publicado` sobre `by_dataCulto` seria table scan.
    .index('by_publicado_and_dataCulto', ['publicado', 'dataCulto'])
    // Painel pastoral: uma igreja, filtrando por status de publicação.
    .index('by_igrejaId_and_publicado_and_dataCulto', [
      'igrejaId',
      'publicado',
      'dataCulto',
    ])
    // Contagem e listagem dos cultos de um autor (limite do plano).
    .index('by_autorId_and_dataCulto', ['autorId', 'dataCulto'])
    .index('by_status', ['status']),

  // ---------------------------------------------------------------------------
  // Frases do dia extraídas dos resumos (compartilhamento e widget)
  // ---------------------------------------------------------------------------
  phrases: defineTable({
    texto: v.string(),
    /** Sermão de origem; ausente em frases avulsas/versículos do dia. */
    sermonId: v.optional(v.id('sermons')),
    /** Dono da frase; ausente quando a frase é do catálogo oficial do app. */
    autorId: v.optional(v.id('users')),
    /** Referência bíblica associada, ex.: "João 3:16". */
    referencia: v.optional(v.string()),
    /** Personalização visual do card gerado para Instagram/WhatsApp. */
    estilo: v.optional(
      v.object({
        corFundo: v.string(),
        corTexto: v.string(),
        fonte: v.string(),
        /** Marca d'água do app: removida no plano Premium. */
        mostrarMarca: v.boolean(),
      }),
    ),
    /** Imagem renderizada no File Storage (Id, não URL). */
    imagemStorageId: v.optional(v.id('_storage')),
    /** Frase fixada no widget da tela inicial. */
    fixadaNoWidget: v.boolean(),
    publicado: v.boolean(),
    criadoEm: v.number(),
  })
    // Widget: a frase fixada mais recente.
    .index('by_fixadaNoWidget_and_criadoEm', ['fixadaNoWidget', 'criadoEm'])
    .index('by_sermonId', ['sermonId'])
    .index('by_autorId_and_criadoEm', ['autorId', 'criadoEm']),

  // ---------------------------------------------------------------------------
  // Histórias: histórias bíblicas e testemunhos (texto + áudio)
  // ---------------------------------------------------------------------------
  stories: defineTable({
    titulo: v.string(),
    /** Categoria define a faixa de público e a navegação no app. */
    categoria: v.union(
      v.literal('historia_biblica'),
      v.literal('testemunho'),
    ),
    publico: v.union(v.literal('criancas'), v.literal('adultos')),
    /** Corpo em texto; dividido em parágrafos. */
    texto: v.string(),
    /** Áudio narrado no File Storage (Id, não URL). */
    audioStorageId: v.optional(v.id('_storage')),
    duracaoSegundos: v.optional(v.number()),
    /** Roteiro/ordem de exibição dentro da categoria. */
    ordem: v.number(),
    publicado: v.boolean(),
    criadoEm: v.number(),
  })
    // Navegação por categoria e público, já na ordem de exibição.
    .index('by_categoria_and_publico_and_publicado_and_ordem', [
      'categoria',
      'publico',
      'publicado',
      'ordem',
    ])
    .index('by_ordem', ['ordem']),

  // ---------------------------------------------------------------------------
  // Recordings: recorded messages with AI transcript and summary
  // ---------------------------------------------------------------------------
  recordings: defineTable({
    userId: v.id('users'),
    anonymousId: v.string(),
    title: v.optional(v.string()),
    status: recordingStatusValidator,
    /** Stage-based progress, 0-100 (the speech API reports none). */
    progress: v.number(),
    audioStorageId: v.id('_storage'),
    durationSeconds: v.number(),
    transcript: v.optional(v.string()),
    summary: v.optional(recordingSummaryValidator),
    /**
     * Failure reason; the audio is kept so the pipeline can be retried. New rows store a code
     * (`PIPELINE_ERROR_CODES`) that the app translates; older rows hold Portuguese text.
     */
    error: v.optional(v.string()),
    /** App language when the recording was made: the language of the AI summary (`SUMMARY_LANGUAGES`). */
    language: v.optional(v.string()),
    church: v.optional(v.string()),
    preacher: v.optional(v.string()),
    meetingType: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_anonymous_id', ['anonymousId'])
    .index('by_status', ['status']),

  // ---------------------------------------------------------------------------
  // Prayer wall: prayer requests and testimonies shared with the community
  // ---------------------------------------------------------------------------
  /**
   * `authorId` is the users document id, NOT the device `anonymousId`: the latter is a secret and
   * must never appear in anything a public query returns. Anonymous posts store only the
   * placeholder name and no location/avatar.
   */
  prayers: defineTable({
    authorId: v.id('users'),
    authorName: v.string(),
    authorLocation: v.optional(v.string()),
    /** Profile picture snapshot (non-anonymous posts only). */
    authorImageId: v.optional(v.id('_storage')),
    isAnonymous: v.boolean(),
    type: prayerTypeValidator,
    category: prayerCategoryValidator,
    title: v.string(),
    content: v.string(),
    scriptureReference: v.optional(v.string()),
    scriptureText: v.optional(v.string()),
    amenCount: v.number(),
    commentCount: v.number(),
    /** Distinct users who reported the post; it is hidden automatically at the configured limit. */
    reportCount: v.number(),
    isHidden: v.boolean(),
    /** Title + content + category (+ author name when public), for the search box. */
    searchText: v.string(),
    createdAt: v.number(),
  })
    // Wall feed (newest first), all types or one type; hidden posts are excluded by the index range.
    .index('by_isHidden_and_createdAt', ['isHidden', 'createdAt'])
    .index('by_type_and_isHidden_and_createdAt', ['type', 'isHidden', 'createdAt'])
    // "Meus Pedidos" and the daily posting limit.
    .index('by_authorId_and_createdAt', ['authorId', 'createdAt'])
    .searchIndex('search_text', { searchField: 'searchText', filterFields: ['type', 'isHidden'] }),

  /** One row per (prayer, user): makes "Amém" idempotent and un-inflatable. */
  prayerAmens: defineTable({
    prayerId: v.id('prayers'),
    userId: v.id('users'),
    createdAt: v.number(),
  }).index('by_prayerId_and_userId', ['prayerId', 'userId']),

  /** One row per (prayer, reporter), so the same person can't hide a post alone. */
  prayerReports: defineTable({
    prayerId: v.id('prayers'),
    userId: v.id('users'),
    createdAt: v.number(),
  }).index('by_prayerId_and_userId', ['prayerId', 'userId']),

  /** Flat comments on a post. Like posts, they never expose the author's users id to clients. */
  prayerComments: defineTable({
    prayerId: v.id('prayers'),
    authorId: v.id('users'),
    /** Snapshot: the profile name, or the anonymous placeholder. */
    authorName: v.string(),
    authorImageId: v.optional(v.id('_storage')),
    isAnonymous: v.boolean(),
    content: v.string(),
    reportCount: v.number(),
    isHidden: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_prayerId_and_isHidden_and_createdAt', ['prayerId', 'isHidden', 'createdAt'])
    .index('by_prayerId', ['prayerId'])
    // Daily comment limit.
    .index('by_authorId_and_createdAt', ['authorId', 'createdAt']),

  prayerCommentReports: defineTable({
    commentId: v.id('prayerComments'),
    userId: v.id('users'),
    createdAt: v.number(),
  }).index('by_commentId_and_userId', ['commentId', 'userId']),

  /** In-app notifications shown behind the bell (someone liked or commented on your post). */
  notifications: defineTable({
    recipientId: v.id('users'),
    type: v.union(v.literal('like'), v.literal('comment')),
    prayerId: v.id('prayers'),
    /** Snapshots, so the list renders without reading the post. */
    prayerType: prayerTypeValidator,
    prayerTitle: v.string(),
    commentId: v.optional(v.id('prayerComments')),
    /** Display name of whoever acted (anonymity-aware snapshot). The actor's id is never stored here. */
    actorName: v.string(),
    previewText: v.optional(v.string()),
    isRead: v.boolean(),
    /** Prevents duplicates, e.g. like -> unlike -> like on the same post. */
    dedupeKey: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_recipientId_and_createdAt', ['recipientId', 'createdAt'])
    .index('by_recipientId_and_isRead', ['recipientId', 'isRead'])
    .index('by_dedupeKey', ['dedupeKey'])
    .index('by_prayerId', ['prayerId']),
});
