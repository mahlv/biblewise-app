import { v } from 'convex/values';
import { internalMutation, query } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';

/**
 * Fluxo do "Gravador de culto".
 *
 * Desenho em etapas, cada uma uma mutation separada — assim o app pode fechar
 * no meio do processo sem perder o estado:
 *
 *   1. `iniciarGravacao`      -> cria o sermão como `gravando` + conta no mês
 *   2. `anexarAudio`          -> sobe o áudio no File Storage e guarda o Id
 *   3. `marcarFalha`          -> registra falha de transcrição
 *   4. `salvarTranscricao`    -> grava o texto completo vindo do Whisper
 *   5. `salvarResumo`         -> grava o resumo estruturado gerado pela IA
 *   6. `aprovarResumo`        -> o pastor revisa e publica
 *
 * IMPORTANTE — por que estas mutations são `internalMutation`:
 * ainda não há autenticação no projeto (o Clerk entra na próxima etapa). Uma
 * mutation PÚBLICA é exposta à internet, e aceitar `autorId`/`aprovadoPor` como
 * argumento permitiria a qualquer cliente se passar por um pastor e publicar um
 * resumo. Enquanto não existir sessão, a identidade não pode ser derivada no
 * servidor, então a escrita fica acessível apenas de dentro do backend
 * (HTTP action autenticada, cron, ou outra function). Quando o Clerk entrar,
 * cada uma vira `mutation` pública lendo `ctx.auth.getUserIdentity()`.
 *
 * As chamadas de IA (Whisper/LLM) são efeitos externos: isso é `action`, que
 * não existe aqui de propósito — mutations não podem fazer fetch.
 */

// ---------------------------------------------------------------------------
// Validadores compartilhados
// ---------------------------------------------------------------------------

/** Resumo estruturado produzido pela IA e revisado pelo pastor. */
const resumoValidator = v.object({
  temaCentral: v.string(),
  versiculosCitados: v.array(v.string()),
  pontosPrincipais: v.array(v.string()),
  aplicacaoPratica: v.string(),
  modeloIa: v.optional(v.string()),
  geradoEm: v.number(),
});

/** Retorno padrão das mutations que só confirmam a escrita. */
const confirmacaoValidator = v.object({ atualizado: v.boolean() });

/**
 * Chave do contador mensal de cultos de um autor.
 * O Convex não tem operador de contagem, então o total é mantido aqui.
 */
function chaveContadorMensal(autorId: Id<'users'>, mesAno: string): string {
  return `sermoes:${mesAno}:${autorId}`;
}

/** Deriva "AAAA-MM" de um timestamp UTC (suficiente para o limite do plano). */
function mesAnoDe(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 7);
}

/**
 * Incrementa um contador denormalizado.
 *
 * DEVE ser chamado na MESMA mutation que escreve na tabela contada, senão
 * contador e dados podem divergir (é a regra do Convex para dados espelhados).
 */
async function incrementarContador(
  ctx: MutationCtx,
  chave: string,
  delta = 1,
): Promise<number> {
  const existente = await ctx.db
    .query('counters')
    .withIndex('by_chave', (q) => q.eq('chave', chave))
    .unique();

  if (existente) {
    const valor = existente.valor + delta;
    await ctx.db.patch('counters', existente._id, { valor, atualizadoEm: Date.now() });
    return valor;
  }

  await ctx.db.insert('counters', { chave, valor: delta, atualizadoEm: Date.now() });
  return delta;
}

/** Lê um contador sem criar nada (leitura pura, segura em query). */
async function lerContador(ctx: QueryCtx, chave: string): Promise<number> {
  const existente = await ctx.db
    .query('counters')
    .withIndex('by_chave', (q) => q.eq('chave', chave))
    .unique();

  return existente?.valor ?? 0;
}

/** Limite de cultos por mês no plano gratuito — regra de negócio do freemium. */
const LIMITE_PLANO_GRATUITO = 2;

// ---------------------------------------------------------------------------
// Mutations (internas até existir autenticação)
// ---------------------------------------------------------------------------

/**
 * Etapa 1 — inicia a gravação e reserva a cota do mês.
 *
 * `autorId` é argumento porque esta função é interna e só é chamada por código
 * do próprio backend, que já validou a sessão. Numa mutation pública isso seria
 * uma falha de autorização.
 */
export const iniciarGravacao = internalMutation({
  args: {
    titulo: v.string(),
    pregador: v.string(),
    autorId: v.id('users'),
    igrejaId: v.optional(v.id('churches')),
    /** Momento do culto; o app envia o timestamp local do dispositivo. */
    dataCulto: v.number(),
  },
  returns: v.object({ sermonId: v.id('sermons'), totalNoMes: v.number() }),
  handler: async (ctx, args) => {
    const titulo = args.titulo.trim();
    const pregador = args.pregador.trim();

    if (titulo.length === 0) throw new Error('O título do culto é obrigatório.');
    if (pregador.length === 0) throw new Error('O nome do pregador é obrigatório.');

    // Confere o plano antes de escrever: o contador é uma leitura de índice.
    const chave = chaveContadorMensal(args.autorId, mesAnoDe(args.dataCulto));
    const usuario = await ctx.db.get('users', args.autorId);
    if (!usuario) throw new Error('Usuário não encontrado.');

    const jaGravados = await lerContador(ctx, chave);
    if (usuario.plano === 'gratuito' && jaGravados >= LIMITE_PLANO_GRATUITO) {
      throw new Error(
        `O plano gratuito permite ${LIMITE_PLANO_GRATUITO} cultos por mês. Assine o Premium para gravar sem limite.`,
      );
    }

    const sermonId = await ctx.db.insert('sermons', {
      titulo,
      pregador,
      igrejaId: args.igrejaId ?? usuario.igrejaId,
      autorId: args.autorId,
      dataCulto: args.dataCulto,
      status: 'gravando',
      publicado: false,
      criadoEm: Date.now(),
    });

    // Mesma transação da inserção — contador e dados nunca divergem.
    const totalNoMes = await incrementarContador(ctx, chave);

    return { sermonId, totalNoMes };
  },
});

/** Etapa 2 — associa o áudio já enviado ao File Storage. */
export const anexarAudio = internalMutation({
  args: {
    sermonId: v.id('sermons'),
    audioStorageId: v.id('_storage'),
    duracaoSegundos: v.optional(v.number()),
  },
  returns: confirmacaoValidator,
  handler: async (ctx, args) => {
    const sermao = await ctx.db.get('sermons', args.sermonId);
    if (!sermao) throw new Error('Sermão não encontrado.');

    await ctx.db.patch('sermons', args.sermonId, {
      audioStorageId: args.audioStorageId,
      duracaoSegundos: args.duracaoSegundos,
      status: 'transcrevendo',
    });

    return { atualizado: true };
  },
});

/** Etapa 3 — registra falha de transcrição para o app oferecer "tentar de novo". */
export const marcarFalha = internalMutation({
  args: { sermonId: v.id('sermons') },
  returns: confirmacaoValidator,
  handler: async (ctx, args) => {
    const sermao = await ctx.db.get('sermons', args.sermonId);
    if (!sermao) throw new Error('Sermão não encontrado.');

    await ctx.db.patch('sermons', args.sermonId, { status: 'falhou' });
    return { atualizado: true };
  },
});

/** Etapa 4 — grava a transcrição completa vinda do Whisper. */
export const salvarTranscricao = internalMutation({
  args: { sermonId: v.id('sermons'), transcricao: v.string() },
  returns: confirmacaoValidator,
  handler: async (ctx, args) => {
    const sermao = await ctx.db.get('sermons', args.sermonId);
    if (!sermao) throw new Error('Sermão não encontrado.');
    if (args.transcricao.trim().length === 0) throw new Error('A transcrição está vazia.');

    await ctx.db.patch('sermons', args.sermonId, { transcricao: args.transcricao });
    return { atualizado: true };
  },
});

/** Etapa 5 — grava o resumo estruturado produzido pela IA (ainda não publicado). */
export const salvarResumo = internalMutation({
  args: { sermonId: v.id('sermons'), resumo: resumoValidator },
  returns: confirmacaoValidator,
  handler: async (ctx, args) => {
    const sermao = await ctx.db.get('sermons', args.sermonId);
    if (!sermao) throw new Error('Sermão não encontrado.');
    if (args.resumo.temaCentral.trim().length === 0) {
      throw new Error('O tema central do resumo é obrigatório.');
    }

    await ctx.db.patch('sermons', args.sermonId, {
      resumo: args.resumo,
      status: 'resumo_pronto',
    });

    return { atualizado: true };
  },
});

/**
 * Etapa 6 — aprovação pastoral.
 *
 * Portão de qualidade do produto: nenhum resumo gerado por IA aparece no app
 * antes de um pastor aprovar. O pastor pode editar o texto na aprovação, o que
 * caracteriza a revisão humana sobre a saída da IA.
 */
export const aprovarResumo = internalMutation({
  args: {
    sermonId: v.id('sermons'),
    aprovadoPor: v.id('users'),
    /** Resumo final, possivelmente editado pelo pastor no momento da revisão. */
    resumoAprovado: v.optional(resumoValidator),
  },
  returns: v.object({ aprovadoEm: v.number() }),
  handler: async (ctx, args) => {
    const sermao = await ctx.db.get('sermons', args.sermonId);
    if (!sermao) throw new Error('Sermão não encontrado.');

    const resumoFinal = args.resumoAprovado ?? sermao.resumo;
    if (!resumoFinal) {
      throw new Error('Não há resumo para aprovar. Gere o resumo primeiro.');
    }

    // Somente pastor ou admin da igreja publicam oficialmente.
    const revisor = await ctx.db.get('users', args.aprovadoPor);
    if (!revisor) throw new Error('Usuário revisor não encontrado.');
    if (revisor.papel !== 'pastor' && revisor.papel !== 'admin_igreja') {
      throw new Error('Apenas pastores ou administradores podem aprovar um resumo.');
    }

    const aprovadoEm = Date.now();

    await ctx.db.patch('sermons', args.sermonId, {
      resumo: resumoFinal,
      status: 'aprovado',
      publicado: true,
      aprovadoPor: args.aprovadoPor,
      aprovadoEm,
    });

    return { aprovadoEm };
  },
});

// ---------------------------------------------------------------------------
// Queries (públicas — o app precisa ler)
// ---------------------------------------------------------------------------

/**
 * Feed público de cultos: os publicados mais recentes, de todas as igrejas.
 *
 * Usa o índice `by_publicado_and_dataCulto`, então o filtro por `publicado` faz
 * parte da varredura de índice. Filtrar `publicado` sobre um índice de data
 * seria table scan.
 */
export const listarPublicados = query({
  args: { limite: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.string(),
      titulo: v.string(),
      pregador: v.string(),
      dataCulto: v.number(),
      duracaoSegundos: v.union(v.number(), v.null()),
      temaCentral: v.union(v.string(), v.null()),
      versiculosCitados: v.array(v.string()),
      audioUrl: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    const limite = Math.min(Math.max(args.limite ?? 20, 1), 100);

    const sermoes = await ctx.db
      .query('sermons')
      .withIndex('by_publicado_and_dataCulto', (q) => q.eq('publicado', true))
      .order('desc')
      .take(limite);

    // A URL do áudio é resolvida sob demanda; nunca guardamos URL no documento.
    return await Promise.all(
      sermoes.map(async (sermao) => ({
        _id: sermao._id as string,
        titulo: sermao.titulo,
        pregador: sermao.pregador,
        dataCulto: sermao.dataCulto,
        duracaoSegundos: sermao.duracaoSegundos ?? null,
        temaCentral: sermao.resumo?.temaCentral ?? null,
        versiculosCitados: sermao.resumo?.versiculosCitados ?? [],
        audioUrl: sermao.audioStorageId
          ? await ctx.storage.getUrl(sermao.audioStorageId)
          : null,
      })),
    );
  },
});

/**
 * Cultos de uma igreja.
 * `incluirNaoPublicados` serve ao painel pastoral (rascunhos e pendentes).
 */
export const listarPorIgreja = query({
  args: {
    igrejaId: v.id('churches'),
    incluirNaoPublicados: v.optional(v.boolean()),
    limite: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.string(),
      titulo: v.string(),
      pregador: v.string(),
      status: v.string(),
      dataCulto: v.number(),
      publicado: v.boolean(),
      temaCentral: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    const limite = Math.min(Math.max(args.limite ?? 30, 1), 100);

    const sermoes = args.incluirNaoPublicados
      ? await ctx.db
          .query('sermons')
          // Sem `eq` em `publicado`, o índice varre todos os valores desse
          // campo para a igreja — que é exatamente o que o painel precisa.
          .withIndex('by_igrejaId_and_publicado_and_dataCulto', (q) =>
            q.eq('igrejaId', args.igrejaId),
          )
          .order('desc')
          .take(limite)
      : await ctx.db
          .query('sermons')
          .withIndex('by_igrejaId_and_publicado_and_dataCulto', (q) =>
            q.eq('igrejaId', args.igrejaId).eq('publicado', true),
          )
          .order('desc')
          .take(limite);

    return sermoes.map((sermao) => ({
      _id: sermao._id as string,
      titulo: sermao.titulo,
      pregador: sermao.pregador,
      status: sermao.status,
      dataCulto: sermao.dataCulto,
      publicado: sermao.publicado,
      temaCentral: sermao.resumo?.temaCentral ?? null,
    }));
  },
});

/** Detalhe de um culto, com resumo e URL do áudio para o player. */
export const obter = query({
  args: { sermonId: v.id('sermons') },
  returns: v.union(
    v.object({
      _id: v.string(),
      titulo: v.string(),
      pregador: v.string(),
      dataCulto: v.number(),
      duracaoSegundos: v.union(v.number(), v.null()),
      status: v.string(),
      publicado: v.boolean(),
      /** `null` enquanto o resumo não foi gerado pela IA. */
      resumo: v.union(resumoValidator, v.null()),
      /** `null` enquanto a transcrição não chegou do Whisper. */
      transcricao: v.union(v.string(), v.null()),
      audioUrl: v.union(v.string(), v.null()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const sermao = await ctx.db.get('sermons', args.sermonId);
    if (!sermao) return null;

    return {
      _id: sermao._id as string,
      titulo: sermao.titulo,
      pregador: sermao.pregador,
      dataCulto: sermao.dataCulto,
      duracaoSegundos: sermao.duracaoSegundos ?? null,
      status: sermao.status,
      publicado: sermao.publicado,
      resumo: sermao.resumo ?? null,
      transcricao: sermao.transcricao ?? null,
      audioUrl: sermao.audioStorageId
        ? await ctx.storage.getUrl(sermao.audioStorageId)
        : null,
    };
  },
});

/**
 * Nota de design: quando o resumo for aprovado, esta é a query que o app usa
 * para montar a "frase do dia". A extração da frase marcante a partir do resumo
 * é trabalho de `action` (chamada ao LLM), não desta camada.
 */

/**
 * Uso mensal do autor — base do limite do plano gratuito.
 *
 * Lê o contador denormalizado em vez de contar sermões: uma leitura de índice
 * em vez de uma varredura de todos os cultos do autor.
 */
export const usoMensal = query({
  args: {
    autorId: v.id('users'),
    /** Qualquer timestamp dentro do mês desejado. */
    referencia: v.number(),
  },
  returns: v.object({
    totalNoMes: v.number(),
    limitePlanoGratuito: v.number(),
    excedeuLimite: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const total = await lerContador(
      ctx,
      chaveContadorMensal(args.autorId, mesAnoDe(args.referencia)),
    );

    return {
      totalNoMes: total,
      limitePlanoGratuito: LIMITE_PLANO_GRATUITO,
      excedeuLimite: total >= LIMITE_PLANO_GRATUITO,
    };
  },
});

// ---------------------------------------------------------------------------
// Tipos auxiliares exportados para o app
// ---------------------------------------------------------------------------

export type ResumoIa = NonNullable<Doc<'sermons'>['resumo']>;
export type SermaoId = Id<'sermons'>;
