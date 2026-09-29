/**
 * Testes de fumaça do Biblewise — rodam sem instalar nada e sem deployment.
 *
 * Usa o suporte nativo do Node 22 a TypeScript (`--experimental-strip-types`),
 * então funciona mesmo antes de `pnpm install`/`convex dev`.
 *
 * Uso:
 *   pnpm test:smoke
 *   node --experimental-strip-types scripts/smoke.ts
 *
 * Excluído do typecheck do app (`tsconfig.json`) de propósito: o Node exige a
 * extensão `.ts` nos imports, e o tsconfig do app não habilita
 * `allowImportingTsExtensions` para não interferir no bundling do Metro.
 * Este arquivo é verificado por `tsc` na execução, via type stripping.
 */
import { BIBLE_BOOKS, parseBibleReference } from '../lib/bibleReference.ts';
import { TOTAL_CAPITULOS, VERSICULOS_INICIAIS } from '../convex/seedData.ts';

let falhas = 0;

function secao(titulo: string): void {
  console.log(`\n=== ${titulo} ===`);
}

function verificar(descricao: string, condicao: boolean, detalhe = ''): void {
  if (!condicao) falhas += 1;
  console.log(`${condicao ? 'OK   ' : 'FALHA'} | ${descricao}${detalhe ? ` -> ${detalhe}` : ''}`);
}

// ---------------------------------------------------------------------------
// 1. Parser de referências: é o que a barra de busca usa.
// ---------------------------------------------------------------------------
secao('Parser de referências bíblicas');

interface CasoParser {
  entrada: string;
  esperado: string | null;
}

const casosParser: CasoParser[] = [
  { entrada: 'João 3:16', esperado: 'João 3:16' },
  { entrada: 'joao 3:16', esperado: 'João 3:16' },
  { entrada: 'Jo 3:16', esperado: 'João 3:16' },
  { entrada: 'joao 3.16', esperado: 'João 3:16' },
  { entrada: '1 Coríntios 13:4-7', esperado: '1 Coríntios 13:4-7' },
  { entrada: '1co 13:4-7', esperado: '1 Coríntios 13:4-7' },
  { entrada: 'Salmos 23', esperado: 'Salmos 23:1' },
  { entrada: 'sl 23', esperado: 'Salmos 23:1' },
  { entrada: 'Gênesis 1:1', esperado: 'Gênesis 1:1' },
  { entrada: 'gn 1:1', esperado: 'Gênesis 1:1' },
  { entrada: 'Apocalipse 21:4', esperado: 'Apocalipse 21:4' },
  { entrada: 'Filipenses 4:13', esperado: 'Filipenses 4:13' },
  { entrada: 'fp 4:13', esperado: 'Filipenses 4:13' },
  { entrada: 'Jó 1:1', esperado: 'Jó 1:1' },
  { entrada: 'job 1:1', esperado: 'Jó 1:1' },
  { entrada: '  João   3 : 16  ', esperado: 'João 3:16' },
  { entrada: 'João 3', esperado: 'João 3:1' },
  { entrada: '1 João 4:8', esperado: '1 João 4:8' },
  { entrada: 'xyz 3:16', esperado: null },
  { entrada: '3:16', esperado: null },
  { entrada: 'João 0:1', esperado: null },
  { entrada: 'João 3:16-4', esperado: null },
  { entrada: '', esperado: null },
];

for (const caso of casosParser) {
  const obtido = parseBibleReference(caso.entrada)?.referencia ?? null;
  verificar(
    `"${caso.entrada}"`,
    obtido === caso.esperado,
    `${obtido ?? 'null'}${obtido === caso.esperado ? '' : ` (esperado: ${caso.esperado ?? 'null'})`}`,
  );
}

// ---------------------------------------------------------------------------
// 2. Consistência do seed com o catálogo e com o parser.
// ---------------------------------------------------------------------------
secao('Consistência dos dados iniciais');

const nomesCanonicos = new Set(BIBLE_BOOKS.map((livro) => livro.nome));
const referenciasVistas = new Set<string>();

for (const [livro, capitulo, versiculo, texto] of VERSICULOS_INICIAIS) {
  const referencia = `${livro} ${capitulo}:${versiculo}`;

  // Livro desconhecido faria `seed.ts` ignorar o versículo em silêncio.
  verificar(`Livro reconhecido: ${livro}`, nomesCanonicos.has(livro));

  const totalCapitulos = TOTAL_CAPITULOS[livro];
  if (totalCapitulos !== undefined) {
    verificar(
      `Capítulo válido: ${livro} ${capitulo} (1..${totalCapitulos})`,
      capitulo >= 1 && capitulo <= totalCapitulos,
    );
  }

  // 176 é o maior capítulo da Bíblia (Salmos 119).
  verificar(`Versículo plausível: ${referencia}`, versiculo >= 1 && versiculo <= 176);

  verificar(`Texto não vazio: ${referencia}`, texto.trim().length > 0);

  // Duplicata faria a busca por índice devolver dois documentos.
  verificar(`Sem duplicata: ${referencia}`, !referenciasVistas.has(referencia));
  referenciasVistas.add(referencia);

  // Ida e volta: exatamente o caminho da barra de busca.
  const parseado = parseBibleReference(referencia);
  verificar(
    `Ida e volta pelo parser: ${referencia}`,
    parseado?.livro === livro &&
      parseado?.capitulo === capitulo &&
      parseado?.versiculoInicial === versiculo,
    parseado ? `${parseado.livro} ${parseado.capitulo}:${parseado.versiculoInicial}` : 'null',
  );
}

for (const nome of Object.keys(TOTAL_CAPITULOS)) {
  verificar(`TOTAL_CAPITULOS existe no catálogo: ${nome}`, nomesCanonicos.has(nome));
}

secao('Resumo');
console.log(`Versículos no seed.: ${VERSICULOS_INICIAIS.length}`);
console.log(`Livros citados.....: ${new Set(VERSICULOS_INICIAIS.map(([l]) => l)).size}`);
console.log(`Livros no catálogo.: ${BIBLE_BOOKS.length}`);
console.log(`Capítulos tabelados: ${Object.keys(TOTAL_CAPITULOS).length}`);
console.log(falhas === 0 ? '\nTodas as verificações passaram.' : `\n${falhas} verificação(ões) falharam.`);

if (falhas > 0) process.exitCode = 1;
