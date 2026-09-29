/**
 * Testa as 4 queries EXATAMENTE como o app as chama, incluindo a de diagnóstico
 * (que meu teste anterior não exercitava com os mesmos argumentos).
 *
 * Se uma query falhar, o `useQuery` lança a cada render e o React estoura o
 * limite de renders — que é o "Too many re-renders" visto no app.
 *
 * Uso: node scripts/verify-queries.mjs
 */
import { readFileSync } from 'node:fs';

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const url = env.match(/^EXPO_PUBLIC_CONVEX_URL=(.+)$/m)?.[1]?.trim();
if (!url) {
  console.error('EXPO_PUBLIC_CONVEX_URL não encontrada em .env.local');
  process.exit(1);
}

const CLIENTE = { format: 'json' };

async function consultar(path, args) {
  const resposta = await fetch(`${url}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, args, ...CLIENTE }),
  });
  const corpo = await resposta.json();
  if (corpo.status === 'error') {
    return { ok: false, erro: corpo.errorMessage };
  }
  return { ok: true, valor: corpo.value };
}

// Os mesmos valores que a tela envia (fuso de Brasília = -180).
const agora = Date.now();
const fusoMinutos = -180;

const chamadas = [
  {
    nome: 'bible:versiculoDoDia',
    args: { data: agora, fusoMinutos },
    descricao: 'Query 1 — versículo do dia (args da tela)',
  },
  {
    nome: 'bible:fraseDoDia',
    args: { data: agora, fusoMinutos },
    descricao: 'Query 3 — frase do dia (args da tela)',
  },
  {
    nome: 'bible:diagnostico',
    args: {}, // a tela chama com args vazios
    descricao: 'Query 4 — diagnóstico (args vazios, como na tela)',
  },
  {
    nome: 'bible:buscarPorTexto',
    args: { termo: 'João 3:16' },
    descricao: 'Query 2 — busca (exemplo digitado)',
  },
];

let falhas = 0;

for (const chamada of chamadas) {
  const r = await consultar(chamada.nome, chamada.args);
  if (r.ok) {
    console.log(`OK    | ${chamada.descricao}`);
    const resumo = JSON.stringify(r.valor);
    console.log(`        ${resumo.length > 150 ? `${resumo.slice(0, 150)}...` : resumo}`);
  } else {
    falhas += 1;
    console.log(`FALHA | ${chamada.descricao}`);
    console.log(`        ${r.erro}`);
  }
}

console.log(
  falhas === 0
    ? '\nAs 4 queries do app respondem sem erro.'
    : `\n${falhas} query(ies) falhando — é a causa provável do loop de render.`,
);
if (falhas > 0) process.exitCode = 1;
