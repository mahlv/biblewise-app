import { v } from 'convex/values';
import { query } from './_generated/server';
import type { Doc } from './_generated/dataModel';
import { parseBibleReference } from '../lib/bibleReference';

/**
 * Consultas da Bíblia digital.
 *
 * Regra do Convex: `query` é somente leitura, determinística e roda dentro de
 * uma transação. Nenhuma função aqui lê o relógio (`Date.now()`) — a data chega
 * como argumento do cliente, porque queries não são reexecutadas só porque o
 * tempo passou.
 *
 * Todas as leituras usam `.withIndex()` e têm limite explícito: nunca há
 * `.collect()` sobre tabela que pode crescer.
 */

// ---------------------------------------------------------------------------
// Validadores de retorno
// ---------------------------------------------------------------------------

/**
 * Forma pública de um versículo devolvida ao app.
 * Usado como `returns` validator: se o handler devolver algo diferente, a
 * chamada falha na validação em vez de entregar dado errado ao cliente.
 */
const versiculoPublicoValidator = v.object({
  _id: v.string(),
  livro: v.string(),
  capitulo: v.number(),
  versiculo: v.number(),
  referencia: v.string(),
  texto: v.string(),
  traducao: v.string(),
  testamento: v.union(v.literal('AT'), v.literal('NT')),
  audioUrl: v.union(v.string(), v.null()),
});

const livroPublicoValidator = v.object({
  _id: v.string(),
  nome: v.string(),
  abreviacao: v.string(),
  testamento: v.union(v.literal('AT'), v.literal('NT')),
  ordem: v.number(),
});

/** Tipo derivado do validador, para anotar os handlers sem duplicar a forma. */
export type VersiculoPublico = {
  _id: string;
  livro: string;
  capitulo: number;
  versiculo: number;
  referencia: string;
  texto: string;
  traducao: string;
  testamento: 'AT' | 'NT';
  audioUrl: string | null;
};

/** Converte um documento de `verses` no formato consumido pela tela. */
function paraVersiculoPublico(versiculo: Doc<'verses'>): VersiculoPublico {
  return {
    _id: versiculo._id,
    livro: versiculo.livro,
    capitulo: versiculo.capitulo,
    versiculo: versiculo.versiculo,
    referencia: `${versiculo.livro} ${versiculo.capitulo}:${versiculo.versiculo}`,
    texto: versiculo.texto,
    traducao: versiculo.traducao,
    testamento: versiculo.testamento,
    audioUrl: versiculo.audioUrl ?? null,
  };
}

/** Converte um destaque pré-computado no mesmo formato público. */
function paraVersiculoDoDestaque(destaque: Doc<'dailyPicks'>): VersiculoPublico {
  const livro = destaque.livro;
  const testamento: 'AT' | 'NT' = destaque.referencia.startsWith('Salmos') ? 'AT' : 'NT';

  return {
    _id: destaque._id,
    livro,
    capitulo: destaque.capitulo,
    versiculo: destaque.versiculo,
    referencia: destaque.referencia,
    texto: destaque.texto,
    traducao: destaque.traducao,
    testamento,
    audioUrl: null,
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Busca um versículo por referência estruturada.
 *
 * Exemplo no app:
 *   useQuery(api.bible.buscarPorReferencia, { livro: 'João', capitulo: 3, versiculo: 16 })
 */
export const buscarPorReferencia = query({
  args: {
    livro: v.string(),
    capitulo: v.number(),
    versiculo: v.number(),
    /** Permite restringir a uma tradução específica quando houver mais de uma. */
    traducao: v.optional(v.string()),
  },
  returns: v.union(versiculoPublicoValidator, v.null()),
  handler: async (ctx, args): Promise<VersiculoPublico | null> => {
    // O índice resolve isso em uma única leitura, sem varredura.
    const candidatos = await ctx.db
      .query('verses')
      .withIndex('by_livro_and_capitulo_and_versiculo', (q) =>
        q
          .eq('livro', args.livro)
          .eq('capitulo', args.capitulo)
          .eq('versiculo', args.versiculo),
      )
      .take(10);

    const versiculo = args.traducao
      ? candidatos.find((item) => item.traducao === args.traducao)
      : candidatos[0];

    return versiculo ? paraVersiculoPublico(versiculo) : null;
  },
});

/**
 * Busca um trecho a partir da referência digitada pelo usuário
 * ("João 3:16", "sl 23", "1 Co 13:4-7").
 *
 * O parsing acontece aqui no servidor com o MESMO parser do app
 * (`lib/bibleReference.ts`), garantindo comportamento idêntico nos dois lados.
 */
export const buscarPorTexto = query({
  args: {
    termo: v.string(),
    traducao: v.optional(v.string()),
    /** Trava de segurança para capítulos longos (Salmos 119 tem 176 versículos). */
    limite: v.optional(v.number()),
  },
  returns: v.array(versiculoPublicoValidator),
  handler: async (ctx, args): Promise<VersiculoPublico[]> => {
    const referencia = parseBibleReference(args.termo);
    if (!referencia) return [];

    const limite = Math.min(Math.max(args.limite ?? 50, 1), 200);

    // Se o usuário informou só o capítulo, devolvemos o capítulo inteiro.
    const somenteCapitulo =
      referencia.versiculoInicial === 1 && referencia.versiculoFinal === 1;

    // Limitamos o range NO ÍNDICE (`lte`) em vez de filtrar depois: assim o
    // banco não devolve versículos que seriam descartados.
    const versiculoFinal = somenteCapitulo
      ? referencia.versiculoInicial + limite - 1
      : referencia.versiculoFinal;

    const versiculos = await ctx.db
      .query('verses')
      .withIndex('by_livro_and_capitulo_and_versiculo', (q) =>
        q
          .eq('livro', referencia.livro)
          .eq('capitulo', referencia.capitulo)
          .gte('versiculo', referencia.versiculoInicial)
          .lte('versiculo', versiculoFinal),
      )
      .take(limite);

    return versiculos
      .filter((item) => !args.traducao || item.traducao === args.traducao)
      .sort((a, b) => a.versiculo - b.versiculo)
      .map(paraVersiculoPublico);
  },
});

/**
 * Lista os versículos de um capítulo, em ordem.
 * `limite` evita carregar capítulos longos inteiros de uma vez.
 */
export const listarCapitulo = query({
  args: {
    livro: v.string(),
    capitulo: v.number(),
    traducao: v.optional(v.string()),
    limite: v.optional(v.number()),
  },
  returns: v.array(versiculoPublicoValidator),
  handler: async (ctx, args): Promise<VersiculoPublico[]> => {
    const limite = Math.min(Math.max(args.limite ?? 50, 1), 200);

    const versiculos = await ctx.db
      .query('verses')
      .withIndex('by_livro_and_capitulo_and_versiculo', (q) =>
        q.eq('livro', args.livro).eq('capitulo', args.capitulo),
      )
      .take(limite);

    return versiculos
      .filter((item) => !args.traducao || item.traducao === args.traducao)
      .map(paraVersiculoPublico);
  },
});

/**
 * Versículo do dia.
 *
 * Lê de `dailyPicks`, uma tabela pequena que o seed materializa. A escolha é
 * `dia % total`: determinística (requisito de `query`) e todos os usuários veem
 * o mesmo versículo no mesmo dia.
 *
 * A data vem do cliente porque ler o relógio dentro de uma query a tornaria
 * não-determinística e impediria o cache de resultados.
 */
export const versiculoDoDia = query({
  args: {
    /** Timestamp em ms, enviado pelo app (`Date.now()`). */
    data: v.number(),
    /** Deslocamento de fuso em minutos; Brasília = -180. */
    fusoMinutos: v.optional(v.number()),
  },
  returns: v.union(versiculoPublicoValidator, v.null()),
  handler: async (ctx, args): Promise<VersiculoPublico | null> => {
    const fuso = args.fusoMinutos ?? -180;
    // Normaliza para o início do dia local, para a troca acontecer à meia-noite.
    const dia = Math.floor((args.data + fuso * 60_000) / 86_400_000);

    // Um ano de destaques cobre a rotação inteira; se a tabela crescer além
    // disso, os últimos ficam fora do ciclo (e o seed é quem define o tamanho).
    const todos = await ctx.db.query('dailyPicks').withIndex('by_ordem').take(366);
    if (todos.length === 0) return null;

    const destaque = todos[dia % todos.length];
    return destaque ? paraVersiculoDoDestaque(destaque) : null;
  },
});

/**
 * Frase do dia para compartilhamento e widget.
 * Sai da mesma tabela de destaques, então não faz varredura nenhuma.
 */
export const fraseDoDia = query({
  args: { data: v.number(), fusoMinutos: v.optional(v.number()) },
  returns: v.union(
    v.object({
      _id: v.string(),
      referencia: v.string(),
      frase: v.string(),
      texto: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const fuso = args.fusoMinutos ?? -180;
    const dia = Math.floor((args.data + fuso * 60_000) / 86_400_000);

    const destaques = await ctx.db.query('dailyPicks').withIndex('by_ordem').take(366);
    if (destaques.length === 0) return null;

    const destaque = destaques[dia % destaques.length];
    if (!destaque) return null;

    return {
      _id: destaque._id,
      referencia: destaque.referencia,
      frase: destaque.frase,
      texto: destaque.texto,
    };
  },
});

/**
 * Livros disponíveis no banco (populado pelo seed).
 * Alimenta o autocomplete da barra de busca.
 *
 * `books` tem no máximo 66 documentos, mas usamos `.take(100)` mesmo assim:
 * nunca deixar uma leitura sem limite explícito.
 */
export const listarLivros = query({
  args: {},
  returns: v.array(livroPublicoValidator),
  handler: async (ctx) => {
    const livros = await ctx.db.query('books').withIndex('by_ordem').take(100);

    return livros.map((livro) => ({
      _id: livro._id as string,
      nome: livro.nome,
      abreviacao: livro.abreviacao,
      testamento: livro.testamento,
      ordem: livro.ordem,
    }));
  },
});

/**
 * Autocomplete de referências: dado o início do que o fiel digitou
 * (ex.: "joa"), devolve os livros correspondentes.
 *
 * O filtro é feito em memória sobre os 66 livros do cânon, que é um conjunto
 * fixo e minúsculo — não há caminho de índice útil para busca por prefixo de
 * substring. Para busca dentro do TEXTO bíblico, o correto é search index.
 */
export const autocompletarReferencia = query({
  args: { termo: v.string(), limite: v.optional(v.number()) },
  returns: v.array(
    v.object({
      nome: v.string(),
      abreviacao: v.string(),
      testamento: v.union(v.literal('AT'), v.literal('NT')),
    }),
  ),
  handler: async (ctx, args) => {
    const termo = args.termo.trim().toLowerCase();
    if (termo.length < 2) return [];

    const limite = Math.min(Math.max(args.limite ?? 8, 1), 20);
    const livros = await ctx.db.query('books').withIndex('by_ordem').take(100);

    return livros
      .filter(
        (livro) =>
          livro.nome.toLowerCase().includes(termo) ||
          livro.abreviacao.toLowerCase().startsWith(termo),
      )
      .slice(0, limite)
      .map((livro) => ({
        nome: livro.nome,
        abreviacao: livro.abreviacao,
        testamento: livro.testamento,
      }));
  },
});

/**
 * Diagnóstico da integração app <-> Convex.
 *
 * Usa `.take(limite + 1)` para reportar saturação: se voltar `limite + 1`
 * documentos, o total real é maior que o reportado. É assim que se conta sem
 * `.collect().length` (que seria uma varredura ilimitada).
 */
export const diagnostico = query({
  args: { limite: v.optional(v.number()) },
  returns: v.object({
    totalVersiculos: v.number(),
    totalLivros: v.number(),
    totalDestaques: v.number(),
    truncado: v.boolean(),
    exemplo: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const limite = Math.min(Math.max(args.limite ?? 500, 1), 1000);

    // Lê um a mais que o limite para detectar truncamento.
    const versiculos = await ctx.db
      .query('verses')
      .withIndex('by_bookOrdem_and_capitulo_and_versiculo')
      .take(limite + 1);
    const livros = await ctx.db.query('books').withIndex('by_ordem').take(100);
    const destaques = await ctx.db.query('dailyPicks').withIndex('by_ordem').take(400);

    const truncado = versiculos.length > limite;
    const primeiro = versiculos[0];

    return {
      totalVersiculos: truncado ? limite : versiculos.length,
      totalLivros: livros.length,
      totalDestaques: destaques.length,
      truncado,
      exemplo: primeiro
        ? `${primeiro.livro} ${primeiro.capitulo}:${primeiro.versiculo}`
        : null,
    };
  },
});
