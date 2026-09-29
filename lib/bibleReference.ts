/**
 * Parser de referências bíblicas em português.
 *
 * Este arquivo é compartilhado entre o app e o backend Convex
 * (ver `convex/bible.ts`), por isso NÃO importa nada de `react-native`
 * nem do Convex — apenas JavaScript/TypeScript puro.
 *
 * Aceita entradas como: "João 3:16", "joao 3.16", "1 Coríntios 13:4-7",
 * "Gn 1:1", "sl 23", "Ap 21:4".
 */

/** Testamento ao qual o livro pertence. */
export type Testament = 'AT' | 'NT';

export interface BibleBook {
  /** Ordem canônica (1 = Gênesis ... 66 = Apocalipse). */
  order: number;
  nome: string;
  testamento: Testament;
  /** Abreviações aceitas na busca. */
  abreviacoes: string[];
}

/**
 * Cânon completo em português (tradução dos nomes mais usados no Brasil).
 * A ordem canônica é a posição do array + 1.
 */
export const BIBLE_BOOKS: BibleBook[] = [
  // ---------------------------- Antigo Testamento ----------------------------
  { order: 1, nome: 'Gênesis', testamento: 'AT', abreviacoes: ['gn', 'gen', 'genes'] },
  { order: 2, nome: 'Êxodo', testamento: 'AT', abreviacoes: ['ex', 'exo', 'exod'] },
  { order: 3, nome: 'Levítico', testamento: 'AT', abreviacoes: ['lv', 'lev', 'levit'] },
  { order: 4, nome: 'Números', testamento: 'AT', abreviacoes: ['nm', 'num', 'numeros'] },
  { order: 5, nome: 'Deuteronômio', testamento: 'AT', abreviacoes: ['dt', 'deut', 'deuteronomio'] },
  { order: 6, nome: 'Josué', testamento: 'AT', abreviacoes: ['js', 'jos', 'josue'] },
  { order: 7, nome: 'Juízes', testamento: 'AT', abreviacoes: ['jz', 'juiz', 'juizes'] },
  { order: 8, nome: 'Rute', testamento: 'AT', abreviacoes: ['rt', 'rute'] },
  { order: 9, nome: '1 Samuel', testamento: 'AT', abreviacoes: ['1sm', '1sam', '1 samuel'] },
  { order: 10, nome: '2 Samuel', testamento: 'AT', abreviacoes: ['2sm', '2sam', '2 samuel'] },
  { order: 11, nome: '1 Reis', testamento: 'AT', abreviacoes: ['1rs', '1re', '1 reis'] },
  { order: 12, nome: '2 Reis', testamento: 'AT', abreviacoes: ['2rs', '2re', '2 reis'] },
  { order: 13, nome: '1 Crônicas', testamento: 'AT', abreviacoes: ['1cr', '1cro', '1 cronicas'] },
  { order: 14, nome: '2 Crônicas', testamento: 'AT', abreviacoes: ['2cr', '2cro', '2 cronicas'] },
  { order: 15, nome: 'Esdras', testamento: 'AT', abreviacoes: ['ed', 'esd', 'esdras'] },
  { order: 16, nome: 'Neemias', testamento: 'AT', abreviacoes: ['ne', 'nee', 'neemias'] },
  { order: 17, nome: 'Ester', testamento: 'AT', abreviacoes: ['et', 'est', 'ester'] },
  { order: 18, nome: 'Jó', testamento: 'AT', abreviacoes: ['jo', 'job'] },
  { order: 19, nome: 'Salmos', testamento: 'AT', abreviacoes: ['sl', 'sal', 'salmo', 'salmos'] },
  { order: 20, nome: 'Provérbios', testamento: 'AT', abreviacoes: ['pv', 'prov', 'proverbios'] },
  { order: 21, nome: 'Eclesiastes', testamento: 'AT', abreviacoes: ['ec', 'ecl', 'eclesiastes'] },
  { order: 22, nome: 'Cantares', testamento: 'AT', abreviacoes: ['ct', 'cant', 'cantares'] },
  { order: 23, nome: 'Isaías', testamento: 'AT', abreviacoes: ['is', 'isa', 'isaias'] },
  { order: 24, nome: 'Jeremias', testamento: 'AT', abreviacoes: ['jr', 'jer', 'jeremias'] },
  { order: 25, nome: 'Lamentações', testamento: 'AT', abreviacoes: ['lm', 'lam', 'lamentacoes'] },
  { order: 26, nome: 'Ezequiel', testamento: 'AT', abreviacoes: ['ez', 'ezeq', 'ezequiel'] },
  { order: 27, nome: 'Daniel', testamento: 'AT', abreviacoes: ['dn', 'dan', 'daniel'] },
  { order: 28, nome: 'Oseias', testamento: 'AT', abreviacoes: ['os', 'ose', 'oseias'] },
  { order: 29, nome: 'Joel', testamento: 'AT', abreviacoes: ['jl', 'joel'] },
  { order: 30, nome: 'Amós', testamento: 'AT', abreviacoes: ['am', 'amos'] },
  { order: 31, nome: 'Obadias', testamento: 'AT', abreviacoes: ['ob', 'oba', 'obadias'] },
  { order: 32, nome: 'Jonas', testamento: 'AT', abreviacoes: ['jn', 'jonas'] },
  { order: 33, nome: 'Miqueias', testamento: 'AT', abreviacoes: ['mq', 'miq', 'miqueias'] },
  { order: 34, nome: 'Naum', testamento: 'AT', abreviacoes: ['na', 'naum'] },
  { order: 35, nome: 'Habacuque', testamento: 'AT', abreviacoes: ['hc', 'hab', 'habacuque'] },
  { order: 36, nome: 'Sofonias', testamento: 'AT', abreviacoes: ['sf', 'sof', 'sofonias'] },
  { order: 37, nome: 'Ageu', testamento: 'AT', abreviacoes: ['ag', 'ageu'] },
  { order: 38, nome: 'Zacarias', testamento: 'AT', abreviacoes: ['zc', 'zac', 'zacarias'] },
  { order: 39, nome: 'Malaquias', testamento: 'AT', abreviacoes: ['ml', 'mal', 'malaquias'] },
  // ---------------------------- Novo Testamento -----------------------------
  { order: 40, nome: 'Mateus', testamento: 'NT', abreviacoes: ['mt', 'mat', 'mateus'] },
  { order: 41, nome: 'Marcos', testamento: 'NT', abreviacoes: ['mc', 'mar', 'marcos'] },
  { order: 42, nome: 'Lucas', testamento: 'NT', abreviacoes: ['lc', 'luc', 'lucas'] },
  { order: 43, nome: 'João', testamento: 'NT', abreviacoes: ['jo', 'joao'] },
  { order: 44, nome: 'Atos', testamento: 'NT', abreviacoes: ['at', 'atos', 'ato'] },
  { order: 45, nome: 'Romanos', testamento: 'NT', abreviacoes: ['rm', 'rom', 'romanos'] },
  { order: 46, nome: '1 Coríntios', testamento: 'NT', abreviacoes: ['1co', '1cor', '1 corintios'] },
  { order: 47, nome: '2 Coríntios', testamento: 'NT', abreviacoes: ['2co', '2cor', '2 corintios'] },
  { order: 48, nome: 'Gálatas', testamento: 'NT', abreviacoes: ['gl', 'gal', 'galatas'] },
  { order: 49, nome: 'Efésios', testamento: 'NT', abreviacoes: ['ef', 'efe', 'efesios'] },
  { order: 50, nome: 'Filipenses', testamento: 'NT', abreviacoes: ['fp', 'fil', 'fl', 'filipenses'] },
  { order: 51, nome: 'Colossenses', testamento: 'NT', abreviacoes: ['cl', 'col', 'colossenses'] },
  { order: 52, nome: '1 Tessalonicenses', testamento: 'NT', abreviacoes: ['1ts', '1tes', '1 tessalonicenses'] },
  { order: 53, nome: '2 Tessalonicenses', testamento: 'NT', abreviacoes: ['2ts', '2tes', '2 tessalonicenses'] },
  { order: 54, nome: '1 Timóteo', testamento: 'NT', abreviacoes: ['1tm', '1tim', '1 timoteo'] },
  { order: 55, nome: '2 Timóteo', testamento: 'NT', abreviacoes: ['2tm', '2tim', '2 timoteo'] },
  { order: 56, nome: 'Tito', testamento: 'NT', abreviacoes: ['tt', 'tit', 'tito'] },
  { order: 57, nome: 'Filemom', testamento: 'NT', abreviacoes: ['fm', 'filem', 'filemom'] },
  { order: 58, nome: 'Hebreus', testamento: 'NT', abreviacoes: ['hb', 'heb', 'hebreus'] },
  { order: 59, nome: 'Tiago', testamento: 'NT', abreviacoes: ['tg', 'tia', 'tiago'] },
  { order: 60, nome: '1 Pedro', testamento: 'NT', abreviacoes: ['1pe', '1pd', '1 pedro'] },
  { order: 61, nome: '2 Pedro', testamento: 'NT', abreviacoes: ['2pe', '2pd', '2 pedro'] },
  { order: 62, nome: '1 João', testamento: 'NT', abreviacoes: ['1jo', '1joao'] },
  { order: 63, nome: '2 João', testamento: 'NT', abreviacoes: ['2jo', '2joao'] },
  { order: 64, nome: '3 João', testamento: 'NT', abreviacoes: ['3jo', '3joao'] },
  { order: 65, nome: 'Judas', testamento: 'NT', abreviacoes: ['jd', 'jud', 'judas'] },
  { order: 66, nome: 'Apocalipse', testamento: 'NT', abreviacoes: ['ap', 'apo', 'apoc', 'apocalipse'] },
];

/**
 * Remove acentos, colapsa espaços e passa para minúsculas.
 * Usado para comparar "João" com "joao" e "Gênesis" com "genesis".
 */
export function normalizeKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.\s]+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Indica se o texto possui acentos ou cedilha.
 *
 * Serve para desempatar livros que colidem ao remover acentos: "Jó" normaliza
 * para "jo", exatamente a abreviação de "João". Se o fiel digitou os acentos,
 * ele sabe qual livro quer; se não digitou, assumimos a abreviação.
 */
function temDiacriticos(value: string): boolean {
  return value !== value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Dois índices separados, e a ordem de consulta resolve a ambiguidade entre
 * nomes de livros e abreviações:
 *
 *  - `NOME_CANONICO`: nomes completos normalizados ("joao", "genesis").
 *  - `ABREVIACOES`: siglas normalizadas ("jo", "gn", "1co").
 *
 * Consultamos o nome canônico primeiro, com uma exceção: quando esse nome
 * depende de acentos que o usuário não digitou, a abreviação vence. Isso dá
 * o comportamento esperado em "Jó 1:1" -> Jó e "Jo 3:16" -> João.
 */
const NOME_CANONICO = new Map<string, BibleBook>();
const ABREVIACOES = new Map<string, BibleBook>();

for (const book of BIBLE_BOOKS) {
  NOME_CANONICO.set(normalizeKey(book.nome), book);

  for (const abreviacao of book.abreviacoes) {
    const chave = normalizeKey(abreviacao);
    const existente = ABREVIACOES.get(chave);

    // Conflito entre abreviações de livros diferentes: vence o livro que vem
    // DEPOIS na ordem canônica, porque siglas curtas são muito mais usadas para
    // os livros popularmente citados. Ex.: "jo" -> João, e não Jó.
    if (!existente || existente.order < book.order) {
      ABREVIACOES.set(chave, book);
    }
  }
}

/**
 * Busca um livro pelo nome ou abreviação já normalizados.
 *
 * Estratégia: nome canônico exato (com desempate por acento) -> abreviação
 * exata -> prefixo (para entradas incompletas como "corintios" sem o número).
 */
export function findBook(termo: string): BibleBook | null {
  const chave = normalizeKey(termo);
  if (!chave) return null;

  const nomeExato = NOME_CANONICO.get(chave);
  if (nomeExato) {
    // O nome canônico só perde para a abreviação quando depende de acentos que
    // não foram digitados (caso "Jó"/"jo").
    if (!temDiacriticos(nomeExato.nome) || temDiacriticos(termo)) {
      return nomeExato;
    }
  }

  const abreviacaoExata = ABREVIACOES.get(chave);
  if (abreviacaoExata) return abreviacaoExata;

  if (nomeExato) return nomeExato;

  // Prefixo: escolhemos a chave mais longa que casa com o que foi digitado,
  // evitando que "jo" capture "josue" quando o usuário quis dizer outra coisa.
  let melhor: BibleBook | null = null;
  let melhorTamanho = -1;

  for (const indice of [NOME_CANONICO, ABREVIACOES]) {
    for (const [chaveIndexada, livro] of indice) {
      if (chaveIndexada.startsWith(chave) && chaveIndexada.length > melhorTamanho) {
        melhor = livro;
        melhorTamanho = chaveIndexada.length;
      }
    }
  }

  return melhor;
}

/** Referência bíblica já interpretada e pronta para consulta no banco. */
export interface ParsedBibleReference {
  livro: string;
  ordem: number;
  testamento: Testament;
  capitulo: number;
  versiculoInicial: number;
  /** Igual a `versiculoInicial` quando não há intervalo. */
  versiculoFinal: number;
  /** Referência normalizada para exibição, ex.: "João 3:16-17". */
  referencia: string;
}

/**
 * Interpreta uma string digitada pelo usuário e devolve a referência estruturada.
 *
 * Formatos aceitos:
 *  - "João 3:16"  / "joao 3.16" / "Jo 3:16"
 *  - "1 Coríntios 13:4-7"
 *  - "Salmos 23"      -> capítulo inteiro (verso 1)
 *  - "Gênesis 1.1"
 *
 * Retorna `null` quando a entrada não é uma referência válida.
 */
export function parseBibleReference(input: string): ParsedBibleReference | null {
  if (!input) return null;

  // Regex tolerante: livro (com número opcional) + capítulo + versículo/intervalo opcional.
  const match = input
    .trim()
    .match(/^\s*([1-3]?\s*[^\d\s][^\d]*?)\s*(\d{1,3})(?:\s*[:.\s]\s*(\d{1,3})(?:\s*[-–a]\s*(\d{1,3}))?)?\s*$/);

  if (!match) return null;

  const [, livroBruto, capituloBruto, versiculoBruto, versiculoFinalBruto] = match;

  const livro = findBook(livroBruto ?? '');
  if (!livro) return null;

  const capitulo = Number(capituloBruto);
  if (!Number.isInteger(capitulo) || capitulo < 1) return null;

  // Sem versículo informado: busca a partir do primeiro versículo do capítulo.
  const versiculoInicial = versiculoBruto ? Number(versiculoBruto) : 1;
  const versiculoFinal = versiculoFinalBruto ? Number(versiculoFinalBruto) : versiculoInicial;

  if (!Number.isInteger(versiculoInicial) || versiculoInicial < 1) return null;
  if (!Number.isInteger(versiculoFinal) || versiculoFinal < versiculoInicial) return null;

  const referencia =
    versiculoFinal > versiculoInicial
      ? `${livro.nome} ${capitulo}:${versiculoInicial}-${versiculoFinal}`
      : `${livro.nome} ${capitulo}:${versiculoInicial}`;

  return {
    livro: livro.nome,
    ordem: livro.order,
    testamento: livro.testamento,
    capitulo,
    versiculoInicial,
    versiculoFinal,
    referencia,
  };
}
