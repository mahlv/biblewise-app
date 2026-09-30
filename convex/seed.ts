import { mutation } from './_generated/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { BIBLE_BOOKS } from '../lib/bibleReference';
import { TOTAL_CAPITULOS, VERSICULOS_INICIAIS } from './data/seedData';

/**
 * Carga inicial do banco.
 *
 * Como rodar (com o `convex dev` ativo):
 *   npx convex run seed:popularBiblia
 *
 * É idempotente: se já existirem versículos, não faz nada. Isso permite rodar
 * várias vezes sem duplicar registros.
 *
 * Sobre segurança: as Escrituras são catálogo público e somente leitura, então
 * esta mutation de seed não exige autenticação. Ela é a única exceção: mutations
 * que gravam dado de usuário são `internalMutation` (ver `convex/sermons.ts`).
 */

/**
 * Extrai uma frase curta e marcante do texto de um versículo.
 *
 * Usada para a "frase do dia" do widget e do compartilhamento. Aqui é uma
 * heurística simples (primeira sentença, com corte por tamanho). A versão
 * definitiva vai usar o LLM para escolher a frase a partir do resumo do sermão;
 * esta existe para o widget já ter conteúdo real no MVP.
 */
function extrairFrase(texto: string, maximo = 140): string {
  // Corta na primeira sentença, se houver.
  const primeiraSentenca = texto.split(/(?<=[.!?])\s+/)[0] ?? texto;
  const limpa = primeiraSentenca.trim();

  if (limpa.length <= maximo) return limpa;

  // Corte por limite de palavra, para não quebrar no meio de uma palavra.
  const cortado = limpa.slice(0, maximo);
  const ultimoEspaco = cortado.lastIndexOf(' ');
  return `${(ultimoEspaco > 40 ? cortado.slice(0, ultimoEspaco) : cortado).trim()}...`;
}

export const popularBiblia = mutation({
  args: {},
  returns: v.object({
    inserido: v.boolean(),
    motivo: v.optional(v.string()),
    totalLivros: v.number(),
    totalVersiculos: v.number(),
    totalDestaques: v.number(),
  }),
  handler: async (ctx) => {
    // Trava de idempotência.
    const existente = await ctx.db
      .query('verses')
      .withIndex('by_bookOrdem_and_capitulo_and_versiculo')
      .take(1);

    if (existente.length > 0) {
      return {
        inserido: false,
        motivo: 'O banco já possui versículos.',
        totalLivros: 0,
        totalVersiculos: 0,
        totalDestaques: 0,
      };
    }

    // --- 1. Livros usados pelo seed -----------------------------------------
    const nomesUsados = new Set(VERSICULOS_INICIAIS.map(([livro]) => livro));
    const idPorLivro = new Map<string, Id<'books'>>();

    for (const livro of BIBLE_BOOKS) {
      if (!nomesUsados.has(livro.nome)) continue;

      const bookId = await ctx.db.insert('books', {
        ordem: livro.order,
        nome: livro.nome,
        abreviacao: livro.abreviacoes[0] ?? livro.nome.toLowerCase(),
        testamento: livro.testamento,
        totalCapitulos: TOTAL_CAPITULOS[livro.nome] ?? 1,
      });

      idPorLivro.set(livro.nome, bookId);
    }

    // --- 2. Versículos -------------------------------------------------------
    const idsVersiculos: Array<{
      _id: Id<'verses'>;
      livro: string;
      capitulo: number;
      versiculo: number;
      texto: string;
    }> = [];

    for (const [nomeLivro, capitulo, versiculo, texto] of VERSICULOS_INICIAIS) {
      const bookId = idPorLivro.get(nomeLivro);
      const livro = BIBLE_BOOKS.find((item) => item.nome === nomeLivro);

      // Sem livro correspondente no parser não há como indexar corretamente.
      if (!bookId || !livro) continue;

      const _id = await ctx.db.insert('verses', {
        bookId,
        // Desnormalizado para permitir ordenação canônica sem join.
        bookOrdem: livro.order,
        livro: nomeLivro,
        testamento: livro.testamento,
        capitulo,
        versiculo,
        texto,
        traducao: 'ARC',
        // Áudio narrado entra numa etapa futura (File Storage + TTS).
      });

      idsVersiculos.push({ _id, livro: nomeLivro, capitulo, versiculo, texto });
    }

    // --- 3. Destaques do dia -------------------------------------------------
    // Materializados aqui para que `bible.versiculoDoDia` seja uma leitura de
    // índice, sem varrer a tabela de versículos nem ler o relógio no servidor.
    for (const [indice, versiculo] of idsVersiculos.entries()) {
      await ctx.db.insert('dailyPicks', {
        ordem: indice,
        referencia: `${versiculo.livro} ${versiculo.capitulo}:${versiculo.versiculo}`,
        texto: versiculo.texto,
        livro: versiculo.livro,
        capitulo: versiculo.capitulo,
        versiculo: versiculo.versiculo,
        traducao: 'ARC',
        verseId: versiculo._id,
        frase: extrairFrase(versiculo.texto),
      });
    }

    return {
      inserido: true,
      totalLivros: idPorLivro.size,
      totalVersiculos: idsVersiculos.length,
      totalDestaques: idsVersiculos.length,
    };
  },
});

/**
 * Grava um usuário de teste para exercitar o caminho de escrita (cultos,
 * contadores, aprovação pastoral) antes de integrarmos o Clerk.
 *
 * Como rodar:
 *   npx convex run seed:criarUsuarioDeTeste
 */
export const criarUsuarioDeTeste = mutation({
  args: {},
  returns: v.object({ criado: v.boolean(), userId: v.id('users') }),
  handler: async (ctx) => {
    // Fixed id (not a UUID) so the seed is idempotent and never collides with
    // a real device-generated `anonymousId`.
    const anonymousId = 'test-local-pastor';

    const existente = await ctx.db
      .query('users')
      .withIndex('by_anonymous_id', (q) => q.eq('anonymousId', anonymousId))
      .unique();

    if (existente) {
      return { criado: false, userId: existente._id };
    }

    const now = Date.now();
    const userId = await ctx.db.insert('users', {
      anonymousId,
      onboardingCompleted: true,
      name: 'Pastor de Teste',
      email: 'pastor@exemplo.com.br',
      role: 'pastor',
      plan: 'church',
      createdAt: now,
      updatedAt: now,
    });

    // Zera o contador do mês corrente para o usuário de teste. É a mesma
    // escrita que `iniciarGravacao` faz, então o contador já nasce coerente.
    const mesAno = new Date().toISOString().slice(0, 7);
    const chave = `sermoes:${mesAno}:${userId}`;

    const contadorExistente = await ctx.db
      .query('counters')
      .withIndex('by_chave', (q) => q.eq('chave', chave))
      .unique();

    if (!contadorExistente) {
      await ctx.db.insert('counters', { chave, valor: 0, atualizadoEm: Date.now() });
    }

    return { criado: true, userId };
  },
});

/**
 * Remove os dados do seed. Só para desenvolvimento.
 *
 * Queries do Convex não podem deletar, então a limpeza é uma mutation que lê em
 * lotes e apaga. Para tabelas muito grandes o padrão seria processar um lote e
 * agendar a continuação com `ctx.scheduler.runAfter(0, ...)`.
 */
export const limparTudo = mutation({
  args: {},
  returns: v.object({ removidos: v.number() }),
  handler: async (ctx) => {
    let removidos = 0;

    // Ordem importa: filhos antes dos pais, para não deixar referência órfã.
    for (const tabela of ['dailyPicks', 'verses', 'books', 'counters'] as const) {
      const linhas = await ctx.db.query(tabela).take(500);
      for (const linha of linhas) {
        await ctx.db.delete(tabela, linha._id);
        removidos += 1;
      }
    }

    return { removidos };
  },
});
