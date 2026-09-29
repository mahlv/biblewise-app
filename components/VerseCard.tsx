import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { VersiculoPublico } from '../convex/bible';

interface Props {
  versiculo: VersiculoPublico;
  /** Rótulo exibido acima da citação, ex.: "Versículo do dia". */
  etiqueta?: string;
}

/**
 * Card de exibição de um versículo.
 * Componente puramente visual: recebe o versículo já pronto do Convex.
 */
export function VerseCard({ versiculo, etiqueta }: Props) {
  return (
    <View style={styles.card}>
      {etiqueta ? <Text style={styles.etiqueta}>{etiqueta}</Text> : null}

      <Text style={styles.referencia}>{versiculo.referencia}</Text>

      <Text style={styles.texto}>{versiculo.texto}</Text>

      <View style={styles.rodape}>
        <Text style={styles.traducao}>{versiculo.traducao}</Text>
        {/* Placeholder do player de áudio: o arquivo entra numa etapa futura. */}
        <Text style={styles.audio}>
          {versiculo.audioUrl ? '🔊 Áudio disponível' : '🔇 Áudio em breve'}
        </Text>
      </View>
    </View>
  );
}

/** Estado de carregamento reutilizado pela tela de busca. */
export function VerseCardLoading() {
  return (
    <View style={[styles.card, styles.centralizado]}>
      <ActivityIndicator color="#8B5E34" />
      <Text style={styles.aviso}>Consultando as Escrituras...</Text>
    </View>
  );
}

/** Estado vazio / erro de referência não encontrada. */
export function VerseCardVazio({ mensagem }: { mensagem: string }) {
  return (
    <View style={[styles.card, styles.centralizado]}>
      <Text style={styles.aviso}>{mensagem}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: '#FFFFFFED',
    borderRadius: 16,
    padding: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E7DCCB',
  },
  centralizado: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  etiqueta: {
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#8B5E34',
    fontWeight: '600',
  },
  referencia: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2F2418',
  },
  texto: {
    fontSize: 17,
    lineHeight: 26,
    color: '#3D2F1F',
  },
  rodape: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  traducao: {
    fontSize: 12,
    color: '#8B5E34',
    fontWeight: '600',
  },
  audio: {
    fontSize: 12,
    color: '#9A8C7A',
  },
  aviso: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B5B49',
    textAlign: 'center',
  },
});
