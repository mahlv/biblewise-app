import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

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
  // Usuários (fiéis, pastores e administradores de igreja)
  // ---------------------------------------------------------------------------
  users: defineTable({
    /**
     * Identificador canônico e estável do provedor de autenticação (Clerk).
     * É o campo usado para ligar a sessão ao documento — nunca o `subject`.
     */
    tokenIdentifier: v.string(),
    nome: v.string(),
    email: v.optional(v.string()),
    /** Permissões dentro do app; `membro` é o padrão do freemium. */
    papel: v.union(
      v.literal('membro'),
      v.literal('pastor'),
      v.literal('admin_igreja'),
    ),
    /** Plano de assinatura que libera os recursos pagos. */
    plano: v.union(
      v.literal('gratuito'),
      v.literal('premium'),
      v.literal('igreja'),
    ),
    /** Igreja vinculada (obrigatória para pastores no plano Igreja). */
    igrejaId: v.optional(v.id('churches')),
    criadoEm: v.number(),
  })
    .index('by_tokenIdentifier', ['tokenIdentifier'])
    .index('by_igrejaId', ['igrejaId']),

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
});
