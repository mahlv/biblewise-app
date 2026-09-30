import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { parseBibleReference } from '../lib/bibleReference';
import { VerseCard, VerseCardLoading, VerseCardVazio } from '../components/VerseCard';

/** Intervalo de atualização do relógio do app (1 minuto). */
const INTERVALO_RELOGIO_MS = 60_000;

/** Local start of day (midnight, in ms) for the given instant. */
function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/**
 * Relógio estável para alimentar as queries.
 *
 * Por que não chamar `Date.now()` direto no corpo do componente:
 * o `useQuery` do Convex memoiza os argumentos por `JSON.stringify`. Um valor
 * que muda a cada render recria a assinatura, o que dispara `setState` dentro
 * do hook e provoca "Too many re-renders" (loop infinito de renderização).
 *
 * Este hook guarda o INÍCIO DO DIA em estado e confere por intervalo, então os
 * argumentos ficam estáveis entre renders e as queries só são refeitas quando a
 * data realmente vira (o que também evita tráfego desnecessário). Como o valor
 * é o mesmo durante o dia todo, o `setState` do intervalo faz bail-out e não
 * provoca re-render.
 */
function useRelogioEstavel(): number {
  const [agora, setAgora] = useState(() => startOfDay(Date.now()));

  useEffect(() => {
    const id = setInterval(() => setAgora(startOfDay(Date.now())), INTERVALO_RELOGIO_MS);
    return () => clearInterval(id);
  }, []);

  return agora;
}

/**
 * Tela principal do MVP: uma barra de busca única.
 *
 * O fiel digita "João 3:16" e o app consulta o Convex pelo índice
 * `by_livro_and_capitulo_and_versiculo`. Enquanto nada é digitado, mostramos o
 * versículo do dia — o que já valida a integração com o backend na primeira
 * abertura.
 */
export function BibleSearchScreen() {
  const [termo, setTermo] = useState('');

  /**
   * O parser roda também no cliente apenas para validar a digitação antes de
   * gastar uma consulta. A validação definitiva acontece no servidor, dentro de
   * `api.bible.buscarPorTexto`, usando exatamente o mesmo parser.
   */
  const referenciaLocal = useMemo(() => parseBibleReference(termo), [termo]);
  const termoDigitado = termo.trim().length > 0;

  // Instante estável (ver `useRelogioEstavel`).
  const agora = useRelogioEstavel();

  /**
   * Queries do Convex são determinísticas: não podem ler o relógio nem o fuso
   * no servidor, então ambos vêm daqui.
   *
   * `getTimezoneOffset()` devolve os minutos a somar para chegar a UTC (Brasília
   * = 180), então invertemos o sinal para a convenção usada no backend.
   * Fica em `useMemo` para não recalcular a cada render.
   */
  const fusoMinutos = useMemo(() => -new Date().getTimezoneOffset(), []);

  // Args memoizados: referência estável evita reassinatura desnecessária.
  const argsDoDia = useMemo(
    () => ({ data: agora, fusoMinutos }),
    [agora, fusoMinutos],
  );

  // --- Query 1: versículo do dia (valida a leitura sem nenhuma digitação) ---
  const versiculoDoDia = useQuery(api.bible.versiculoDoDia, argsDoDia);

  // --- Query 2: busca por referência digitada ---
  // `'skip'` evita consultar o backend enquanto a barra está vazia.
  const resultadoBusca = useQuery(
    api.bible.buscarPorTexto,
    termoDigitado ? { termo } : 'skip',
  );

  // --- Query 3: frase do dia (alimenta o widget e o compartilhamento) ---
  const fraseDoDia = useQuery(api.bible.fraseDoDia, argsDoDia);

  // --- Query 4: diagnóstico do seed (útil nesta etapa de integração) ---
  // Args vazios memoizados: `{}` inline seria uma referência nova a cada render.
  const argsVazios = useMemo(() => ({}), []);
  const diagnostico = useQuery(api.bible.diagnostico, argsVazios);

  const buscando = resultadoBusca === undefined && termoDigitado;
  const semResultado = Array.isArray(resultadoBusca) && resultadoBusca.length === 0;
  const semDadosNoBanco = diagnostico !== undefined && diagnostico.totalVersiculos === 0;

  const limparBusca = useCallback(() => setTermo(''), []);

  return (
    <View style={styles.tela}>
      <ScrollView
        contentContainerStyle={styles.conteudo}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.cabecalho}>
          <Text style={styles.titulo}>Biblewise</Text>
          <Text style={styles.subtitulo}>
            Digite uma referência para encontrar o versículo
          </Text>
        </View>

        {/* Barra de busca única — coração do app minimalista. */}
        <TextInput
          value={termo}
          onChangeText={setTermo}
          onSubmitEditing={Keyboard.dismiss}
          placeholder="Ex.: João 3:16"
          placeholderTextColor="#A79680"
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="search"
          style={styles.barraBusca}
        />

        {/* Aviso amigável quando o termo digitado não é uma referência válida. */}
        {termoDigitado && !referenciaLocal && !buscando ? (
          <Text style={styles.dica}>
            Não reconheci essa referência. Tente algo como “Salmos 23” ou
            “1 Coríntios 13:4-7”.
          </Text>
        ) : null}

        {/* Alerta de banco vazio: indica que o seed ainda não rodou. */}
        {semDadosNoBanco ? (
          <Text style={styles.alerta}>
            Nenhum versículo no banco. Rode o seed:{'\n'}
            <Text style={styles.codigo}>npx convex run seed:popularBiblia</Text>
          </Text>
        ) : null}

        {/* --- Resultado da busca digitada --- */}
        {termoDigitado ? (
          buscando ? (
            <VerseCardLoading />
          ) : semResultado ? (
            <VerseCardVazio mensagem={`Nada encontrado para “${termo.trim()}”.`} />
          ) : (
            resultadoBusca?.map((versiculo) => (
              <VerseCard key={versiculo._id} versiculo={versiculo} />
            ))
          )
        ) : (
          /* --- Sem digitação: versículo do dia + status da integração --- */
          <>
            {versiculoDoDia === undefined ? (
              <VerseCardLoading />
            ) : versiculoDoDia === null ? (
              <VerseCardVazio mensagem="Sem versículo do dia por enquanto." />
            ) : (
              <VerseCard versiculo={versiculoDoDia} etiqueta="Versículo do dia" />
            )}

            {/* Frase do dia: é o conteúdo que vai para o widget e o Instagram. */}
            {fraseDoDia ? (
              <View style={styles.fraseCard}>
                <Text style={styles.fraseEtiqueta}>Frase do dia</Text>
                <Text style={styles.frase}>“{fraseDoDia.frase}”</Text>
                <Text style={styles.fraseReferencia}>{fraseDoDia.referencia}</Text>
              </View>
            ) : null}

            {diagnostico ? (
              <View style={styles.status}>
                <Text style={styles.statusTexto}>
                  Convex conectado • {diagnostico.totalVersiculos}
                  {diagnostico.truncado ? '+' : ''} versículos •{' '}
                  {diagnostico.totalLivros} livros • {diagnostico.totalDestaques}{' '}
                  destaques
                </Text>
              </View>
            ) : null}
          </>
        )}

        {/* Botão de limpar, útil no teste manual no dispositivo. */}
        {termoDigitado ? (
          <Pressable onPress={limparBusca} style={styles.limpar}>
            <Text style={styles.limparTexto}>Limpar busca</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    width: '100%',
  },
  conteudo: {
    padding: 20,
    // A área segura agora é tratada pela Home (SafeAreaView).
    paddingTop: 24,
    gap: 14,
    alignItems: 'stretch',
  },
  cabecalho: {
    gap: 4,
    marginBottom: 6,
  },
  titulo: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2F2418',
  },
  subtitulo: {
    fontSize: 15,
    color: '#6B5B49',
  },
  barraBusca: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCCFBB',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    color: '#2F2418',
  },
  dica: {
    fontSize: 13,
    color: '#A2641F',
  },
  alerta: {
    fontSize: 13,
    lineHeight: 20,
    color: '#8A3B1F',
    backgroundColor: '#FBEDE6',
    borderRadius: 10,
    padding: 12,
  },
  codigo: {
    fontFamily: 'monospace',
    color: '#5A2612',
  },
  fraseCard: {
    backgroundColor: '#F3E9DA',
    borderRadius: 16,
    padding: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E0D0B8',
  },
  fraseEtiqueta: {
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#8B5E34',
    fontWeight: '600',
  },
  frase: {
    fontSize: 18,
    lineHeight: 27,
    fontStyle: 'italic',
    color: '#2F2418',
  },
  fraseReferencia: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B5E34',
    textAlign: 'right',
  },
  status: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  statusTexto: {
    fontSize: 12,
    color: '#8B7A66',
    textAlign: 'center',
  },
  limpar: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  limparTexto: {
    fontSize: 14,
    color: '#8B5E34',
    fontWeight: '600',
  },
});
