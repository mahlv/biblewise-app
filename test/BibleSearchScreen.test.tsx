import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { ConvexProvider } from 'convex/react';
import { BibleSearchScreen } from '../screens/BibleSearchScreen';
import { FakeConvexClient } from './fakeConvexClient';

/**
 * Teste de regressão do loop de renderização ("Too many re-renders").
 *
 * Monta a tela REAL com o `ConvexProvider` e um cliente falso, e verifica:
 *  1. a tela renderiza e converge (sem ciclo de renderização);
 *  2. as queries aparecem (busca por referência, versículo do dia, frase do dia);
 *  3. nenhuma query é reassinada a cada render (prova de argumentos estáveis);
 *  4. uma query que falha é LANÇADA pelo `useQuery` — o mecanismo que produz o
 *     erro no app, documentado aqui para não se perder.
 */

const VERSICULO_DO_DIA = {
  _id: 'pick_1',
  livro: 'Salmos',
  capitulo: 23,
  versiculo: 1,
  referencia: 'Salmos 23:1',
  texto: 'O Senhor é o meu pastor; nada me faltará.',
  traducao: 'ARC',
  testamento: 'AT' as const,
  audioUrl: null,
};

const FRASE_DO_DIA = {
  _id: 'pick_1',
  referencia: 'Salmos 23:1',
  frase: 'O Senhor é o meu pastor; nada me faltará.',
  texto: 'O Senhor é o meu pastor; nada me faltará.',
};

const DIAGNOSTICO = {
  totalVersiculos: 31,
  totalLivros: 14,
  totalDestaques: 31,
  truncado: false,
  exemplo: 'Gênesis 1:1',
};

const RESULTADO_BUSCA = [
  {
    _id: 'verse_1',
    livro: 'João',
    capitulo: 3,
    versiculo: 16,
    referencia: 'João 3:16',
    texto: 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito.',
    traducao: 'ARC',
    testamento: 'NT' as const,
    audioUrl: null,
  },
];

/** Coleta todo o texto renderizado na árvore, para asserções legíveis. */
function textoRenderizado(arvore: ReactTestRenderer): string {
  const pedacos: string[] = [];

  const visitar = (no: unknown): void => {
    if (no === null || no === undefined) return;
    if (typeof no === 'string') {
      pedacos.push(no);
      return;
    }
    if (Array.isArray(no)) {
      no.forEach(visitar);
      return;
    }
    if (typeof no === 'object' && 'children' in no) {
      visitar((no as { children: unknown }).children);
    }
  };

  visitar(arvore.toJSON());
  return pedacos.join(' ');
}

function montarTela(cliente: FakeConvexClient) {
  let arvore: ReactTestRenderer | undefined;

  act(() => {
    arvore = create(
      <ConvexProvider client={cliente as never}>
        <BibleSearchScreen />
      </ConvexProvider>,
    );
  });

  if (!arvore) throw new Error('A árvore não foi criada.');
  return arvore;
}

/** Aguarda as promises pendentes (o hook resolve de forma assíncrona). */
async function aguardarAtualizacoes(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('BibleSearchScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renderiza sem entrar em ciclo de renderização', async () => {
    const erroDeConsole = jest.spyOn(console, 'error').mockImplementation(() => {});

    const cliente = new FakeConvexClient();
    cliente.definirResposta('bible:versiculoDoDia', VERSICULO_DO_DIA);
    cliente.definirResposta('bible:fraseDoDia', FRASE_DO_DIA);
    cliente.definirResposta('bible:diagnostico', DIAGNOSTICO);
    cliente.definirResposta('bible:buscarPorTexto', RESULTADO_BUSCA);

    const arvore = montarTela(cliente);
    await aguardarAtualizacoes();

    const conteudo = textoRenderizado(arvore);
    expect(conteudo).toContain('Biblewise');
    expect(conteudo).toContain('Salmos 23:1');

    // Nenhum aviso do React, inclusive o "Maximum update depth exceeded".
    const avisos = erroDeConsole.mock.calls.map((c) => String(c[0])).join('\n');
    expect(avisos).not.toMatch(/Maximum update depth|Too many re-renders/i);

    erroDeConsole.mockRestore();
  });

  it('mostra o versículo do dia e a frase do dia quando nada foi digitado', async () => {
    const cliente = new FakeConvexClient();
    cliente.definirResposta('bible:versiculoDoDia', VERSICULO_DO_DIA);
    cliente.definirResposta('bible:fraseDoDia', FRASE_DO_DIA);
    cliente.definirResposta('bible:diagnostico', DIAGNOSTICO);
    cliente.definirResposta('bible:buscarPorTexto', RESULTADO_BUSCA);

    const arvore = montarTela(cliente);
    await aguardarAtualizacoes();

    const conteudo = textoRenderizado(arvore);
    expect(conteudo).toContain('Versículo do dia');
    expect(conteudo).toContain('nada me faltará');
    expect(conteudo).toContain('Frase do dia');
    expect(conteudo).toContain('Convex conectado');
    expect(conteudo).toContain('31');
  });

  it('não reassina as queries a cada render (argumentos estáveis)', async () => {
    const cliente = new FakeConvexClient();
    cliente.definirResposta('bible:versiculoDoDia', VERSICULO_DO_DIA);
    cliente.definirResposta('bible:fraseDoDia', FRASE_DO_DIA);
    cliente.definirResposta('bible:diagnostico', DIAGNOSTICO);
    cliente.definirResposta('bible:buscarPorTexto', RESULTADO_BUSCA);

    const arvore = montarTela(cliente);
    await aguardarAtualizacoes();

    const assinaturasIniciais = {
      versiculoDoDia: cliente.contarAssinaturas('bible:versiculoDoDia'),
      fraseDoDia: cliente.contarAssinaturas('bible:fraseDoDia'),
      diagnostico: cliente.contarAssinaturas('bible:diagnostico'),
    };

    // Provoca re-renders sem mudar nenhum argumento: o relógio avança 3x.
    await act(async () => {
      jest.advanceTimersByTime(3 * 60_000);
      await Promise.resolve();
    });

    // Se um argumento fosse instável, cada re-render criaria uma assinatura nova
    // (uma por milissegundo do relógio), e a contagem explodiria.
    expect(cliente.contarAssinaturas('bible:versiculoDoDia')).toBe(
      assinaturasIniciais.versiculoDoDia,
    );
    expect(cliente.contarAssinaturas('bible:fraseDoDia')).toBe(
      assinaturasIniciais.fraseDoDia,
    );
    expect(cliente.contarAssinaturas('bible:diagnostico')).toBe(
      assinaturasIniciais.diagnostico,
    );

    arvore.unmount();
  });

  it('busca por referência digitada e mostra o versículo encontrado', async () => {
    const cliente = new FakeConvexClient();
    cliente.definirResposta('bible:versiculoDoDia', VERSICULO_DO_DIA);
    cliente.definirResposta('bible:fraseDoDia', FRASE_DO_DIA);
    cliente.definirResposta('bible:diagnostico', DIAGNOSTICO);
    cliente.definirResposta('bible:buscarPorTexto', RESULTADO_BUSCA);

    const arvore = montarTela(cliente);
    await aguardarAtualizacoes();

    const campo = arvore.root.findByType(
      require('react-native').TextInput,
    );

    await act(async () => {
      campo.props.onChangeText('João 3:16');
      await Promise.resolve();
    });

    const conteudo = textoRenderizado(arvore);
    expect(conteudo).toContain('João 3:16');
    expect(conteudo).toContain('Deus amou o mundo');

    arvore.unmount();
  });

  it('mostra a dica quando o texto digitado não é uma referência válida', async () => {
    const cliente = new FakeConvexClient();
    cliente.definirResposta('bible:versiculoDoDia', VERSICULO_DO_DIA);
    cliente.definirResposta('bible:fraseDoDia', FRASE_DO_DIA);
    cliente.definirResposta('bible:diagnostico', DIAGNOSTICO);
    cliente.definirResposta('bible:buscarPorTexto', []);

    const arvore = montarTela(cliente);
    await aguardarAtualizacoes();

    const { TextInput } = require('react-native');
    const campo = arvore.root.findByType(TextInput);

    await act(async () => {
      campo.props.onChangeText('xyzabc');
      await Promise.resolve();
    });

    expect(textoRenderizado(arvore)).toContain('Não reconheci essa referência');

    arvore.unmount();
  });

  it('uma query que falha é lançada como erro de renderização', async () => {
    /**
     * Este é o mecanismo por trás do "Too many re-renders" relatado no app.
     *
     * `useQuery` faz `if (result instanceof Error) throw result`. Sem um error
     * boundary, o React reexecuta o render, que lança de novo — e o contador de
     * renders estoura. O teste documenta que a falha chega como exceção de
     * renderização, e não como valor.
     */
    const cliente = new FakeConvexClient();
    cliente.definirResposta('bible:versiculoDoDia', new Error('Query falhou no servidor'));
    cliente.definirResposta('bible:fraseDoDia', FRASE_DO_DIA);
    cliente.definirResposta('bible:diagnostico', DIAGNOSTICO);
    cliente.definirResposta('bible:buscarPorTexto', RESULTADO_BUSCA);

    // O React imprime o erro no console antes de propagá-lo.
    const erroDeConsole = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => montarTela(cliente)).toThrow(/Query falhou no servidor/);

    erroDeConsole.mockRestore();
  });
});
