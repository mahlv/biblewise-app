/**
 * Verificação end-to-end contra o deployment Convex real.
 *
 * Usa a API HTTP que o app React Native consome (mesmo caminho de rede),
 * evitando o problema de quoting de argumentos JSON no PowerShell/Windows.
 *
 * Uso: node scripts/verify-deployment.mjs
 * Requer `EXPO_PUBLIC_CONVEX_URL` (lido do .env.local gerado pelo `convex dev`).
 */
import { readFileSync } from 'node:fs';

// Lê a URL do deployment do .env.local gerado pelo `convex dev`.
const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const url = env.match(/^EXPO_PUBLIC_CONVEX_URL=(.+)$/m)?.[1]?.trim();

if (!url) {
  console.error('EXPO_PUBLIC_CONVEX_URL não encontrada em .env.local');
  process.exit(1);
}

const base = `${url}/api/query`;

/** Chama uma query pública do Convex pela API HTTP (sem autenticação). */
async function consultar(caminho, args) {
  const resposta = await fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: caminho, args, format: 'json' }),
  });

  const corpo = await resposta.json();

  if (corpo.status === 'error') {
    throw new Error(`${caminho}: ${corpo.errorMessage}`);
  }

  return corpo.value;
}

let falhas = 0;

function verificar(descricao, condicao, detalhe = '') {
  if (!condicao) falhas += 1;
  console.log(`${condicao ? 'OK   ' : 'FALHA'} | ${descricao}${detalhe ? ` -> ${detalhe}` : ''}`);
}

console.log(`Deployment: ${url}\n`);

// --- 1. Diagnóstico do seed -------------------------------------------------
const diag = await consultar('bible:diagnostico', {});
verificar('Seed populou o banco', diag.totalVersiculos > 0, `${diag.totalVersiculos} versículos, ${diag.totalLivros} livros`);
verificar('Exemplo legível', typeof diag.exemplo === 'string', diag.exemplo);

// --- 2. Busca por referência acentuada (o caso do usuário) ------------------
const joao = await consultar('bible:buscarPorTexto', { termo: 'João 3:16' });
verificar('Busca "João 3:16" retorna 1 versículo', joao.length === 1, `${joao.length} resultado(s)`);
verificar('Referência formatada corretamente', joao[0]?.referencia === 'João 3:16', joao[0]?.referencia);
verificar('Texto correto', typeof joao[0]?.texto === 'string' && joao[0].texto.length > 0, joao[0]?.texto?.slice(0, 60) + '...');

// --- 3. Normalização: sem acento, abreviação e maiúsculas -------------------
for (const termo of ['joao 3:16', 'Jo 3:16', '  JOÃO   3:16  ']) {
  const r = await consultar('bible:buscarPorTexto', { termo });
  verificar(`Normaliza "${termo}"`, r[0]?.referencia === 'João 3:16', r[0]?.referencia ?? 'nenhum');
}

// --- 4. Intervalo e capítulo inteiro ---------------------------------------
const intervalo = await consultar('bible:buscarPorTexto', { termo: 'João 3:16-17' });
verificar('Intervalo "João 3:16-17" retorna 2 versículos', intervalo.length === 2, `${intervalo.length}`);

const salmo = await consultar('bible:buscarPorTexto', { termo: 'Salmos 23' });
verificar('Capítulo inteiro "Salmos 23" retorna 3 versículos', salmo.length === 3, `${salmo.length}`);

// --- 5. O caso "Jó" vs "João" que corrigimos no parser ----------------------
const jo = await consultar('bible:buscarPorTexto', { termo: 'Jó 1:1' });
verificar('"Jó 1:1" não retorna João', jo.length === 0 || jo[0].livro === 'Jó', jo[0]?.referencia ?? 'nenhum (Jó não está no seed)');

// --- 6. Entrada inválida não derruba a função -------------------------------
const invalido = await consultar('bible:buscarPorTexto', { termo: 'xyz 99:99' });
verificar('Referência inválida retorna lista vazia', Array.isArray(invalido) && invalido.length === 0);

// --- 7. Versículo do dia é determinístico ----------------------------------
const dia1 = await consultar('bible:versiculoDoDia', { data: 1_760_000_000_000, fusoMinutos: -180 });
const dia2 = await consultar('bible:versiculoDoDia', { data: 1_760_000_000_000, fusoMinutos: -180 });
verificar('versiculoDoDia é determinístico', dia1?.referencia === dia2?.referencia, dia1?.referencia);
verificar('versiculoDoDia retorna um versículo', dia1 !== null && typeof dia1?.texto === 'string');

// Dias diferentes devem dar versículos diferentes (prova a rotação).
const outroDia = await consultar('bible:versiculoDoDia', { data: 1_760_000_000_000 + 86_400_000, fusoMinutos: -180 });
verificar('dias diferentes rotacionam o destaque', dia1?.referencia !== outroDia?.referencia, `${dia1?.referencia} / ${outroDia?.referencia}`);

// --- 8. Frase do dia (widget) ----------------------------------------------
const frase = await consultar('bible:fraseDoDia', { data: 1_760_000_000_000, fusoMinutos: -180 });
verificar('fraseDoDia retorna frase e referência', Boolean(frase?.frase && frase?.referencia), `${frase?.referencia}: "${frase?.frase?.slice(0, 50)}..."`);
verificar('frase não é o texto inteiro (foi resumida)', (frase?.frase?.length ?? 0) <= 143, `${frase?.frase?.length} caracteres`);

// --- 9. Autocomplete --------------------------------------------------------
const auto = await consultar('bible:autocompletarReferencia', { termo: 'jo' });
verificar('Autocomplete "jo" devolve livros', auto.length > 0, auto.map((l) => l.nome).join(', '));

// --- 10. O fluxo de sermão está FECHADO até existir autenticação -----------
/**
 * As mutations de sermão são `internalMutation` de propósito: sem sessão, uma
 * mutation pública aceitando `autorId` deixaria qualquer cliente se passar por
 * um pastor. A API HTTP só expõe funções públicas, então estas devem falhar.
 */
for (const caminho of ['sermons:iniciarGravacao', 'sermons:aprovarResumo']) {
  let bloqueado = false;
  try {
    await fetch(`${url}/api/mutation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: caminho, args: {}, format: 'json' }),
    }).then((r) => r.json()).then((c) => {
      if (c.status === 'error') bloqueado = true;
      else throw new Error(`EXPOSTO! ${caminho} aceitou chamada pública`);
    });
  } catch (erro) {
    if (String(erro).includes('EXPOSTO')) throw erro;
    bloqueado = true;
  }
  verificar(`${caminho} está interno (não exposto)`, bloqueado);
}

console.log(falhas === 0 ? '\nIntegração app <-> Convex validada.' : `\n${falhas} verificação(ões) falharam.`);
if (falhas > 0) process.exitCode = 1;
