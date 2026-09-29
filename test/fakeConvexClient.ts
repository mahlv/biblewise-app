import type { Watch } from 'convex/react';

/**
 * Cliente Convex falso para testes.
 *
 * Por que não usar o `ConvexReactClient` real: ele abre um WebSocket e depende
 * de rede, o que tornaria o teste lento e instável. O que interessa testar aqui
 * é o comportamento dos HOOKS (assinatura, identidade, contagem de renders), e
 * para isso basta imitar a interface que o React consome.
 *
 * O que este falso reproduz do cliente real (verificado no fonte instalado,
 * `convex/dist/cjs/browser/sync/client.js`):
 *
 *  1. `watchQuery(query, args)` devolve o MESMO watch para a mesma dupla
 *     (nome da query + args). O cliente real guarda por token.
 *  2. `localQueryResult()` devolve sempre a MESMA referência enquanto o
 *     resultado não muda — é isso que faz `useSubscription` fazer bail-out.
 *  3. Se a query falhou, `localQueryResult()` LANÇA. O `useQuery` relança o erro
 *     durante o render, e relançar a cada render é o que produz
 *     "Too many re-renders".
 */
export type RespostaDeTeste = unknown | Error;

export class FakeConvexClient {
  /** Resultado atual por nome de query. */
  private respostas = new Map<string, RespostaDeTeste>();
  /** Um watch por nome de query, como o cliente real faz por token. */
  private watches = new Map<string, Watch<unknown>>();
  private observadores = new Set<() => void>();
  /** Quantas vezes cada query foi assinada (prova se houve reassinatura). */
  public readonly assinaturas = new Map<string, number>();

  /** Define o resultado de uma query. `Error` simula falha no servidor. */
  definirResposta(nomeDaQuery: string, resposta: RespostaDeTeste): void {
    this.respostas.set(nomeDaQuery, resposta);
    // Notifica como o servidor faria numa transição.
    for (const notificar of this.observadores) notificar();
  }

  /** Quantas vezes uma query foi assinada neste teste. */
  contarAssinaturas(nomeDaQuery: string): number {
    return this.assinaturas.get(nomeDaQuery) ?? 0;
  }

  watchQuery(query: unknown, ...args: unknown[]): Watch<unknown> {
    const nome = nomeDaQuery(query);
    const chave = `${nome}:${JSON.stringify(args[0] ?? {})}`;

    const existente = this.watches.get(chave);
    if (existente) return existente;

    this.assinaturas.set(nome, this.contarAssinaturas(nome) + 1);

    const observadoresDoWatch = new Set<() => void>();

    const watch: Watch<unknown> = {
      onUpdate: (callback: () => void) => {
        observadoresDoWatch.add(callback);
        const notificar = () => {
          for (const cb of observadoresDoWatch) cb();
        };
        this.observadores.add(notificar);
        return () => {
          observadoresDoWatch.delete(callback);
          this.observadores.delete(notificar);
        };
      },
      localQueryResult: () => {
        const resposta = this.respostas.get(nome);
        // Igual ao cliente real: erro de query é LANÇADO, não devolvido.
        if (resposta instanceof Error) throw resposta;
        return resposta;
      },
      journal: () => undefined,
    };

    this.watches.set(chave, watch);
    return watch;
  }
}

/**
 * Extrai o nome da query a partir da referência gerada (`api.bible.x`).
 *
 * O Convex marca as referências com `Symbol.for("functionName")` cujo valor é
 * o caminho da função, ex.: "bible:versiculoDoDia".
 * (Ver `convex/dist/cjs/server/functionName.js`.)
 */
const SIMBOLO_NOME_DA_FUNCAO = Symbol.for('functionName');

function nomeDaQuery(query: unknown): string {
  if (typeof query === 'string') return query;

  if (query && typeof query === 'object') {
    const nome = (query as Record<symbol, unknown>)[SIMBOLO_NOME_DA_FUNCAO];
    if (typeof nome === 'string') return nome;
  }

  throw new Error(
    'Não consegui extrair o nome da query. A referência não parece ser do Convex.',
  );
}
