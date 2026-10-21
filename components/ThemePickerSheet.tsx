import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomSheet } from './BottomSheet';
import { ThemeRow } from './ThemeRow';
import { BIBLE_THEMES, isThemeUnlocked } from '../constants/bibleThemes';
import { useToast } from '../hooks/useToast';
import { colors, fonts, radius, spacing } from '../theme/tokens';

interface Props {
  visible: boolean;
  appliedThemeId: string;
  onApply: (themeId: string) => void;
  onClose: () => void;
}

const COMING_SOON = 'Disponível em breve';

export function ThemePickerSheet({ visible, appliedThemeId, onApply, onClose }: Props) {
  const toast = useToast();
  const [pendingId, setPendingId] = useState(appliedThemeId);

  // Discard an unapplied pick so the sheet reopens on the applied theme.
  const close = () => {
    setPendingId(appliedThemeId);
    onClose();
  };

  const handlePressTheme = (id: string) => {
    const theme = BIBLE_THEMES.find((item) => item.id === id);
    if (!theme) return;
    if (!isThemeUnlocked(theme)) {
      toast(COMING_SOON);
      return;
    }
    setPendingId(id);
  };

  return (
    <BottomSheet visible={visible} onClose={close} heightRatio={0.92}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="book-open-page-variant" size={20} color={colors.primary} />
        <View style={styles.headerTexts}>
          <Text style={styles.title}>Temas da Bíblia</Text>
          <Text style={styles.subtitle}>Personalize a atmosfera visual da sua leitura</Text>
        </View>
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Fechar" style={styles.close}>
          <MaterialCommunityIcons name="close" size={18} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#FFE3EC', '#E4ECFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
          <MaterialCommunityIcons name="star-four-points" size={30} color={colors.primary} />
          <View style={styles.bannerTexts}>
            <Text style={styles.bannerTitle}>Recurso Premium</Text>
            <Text style={styles.bannerBody}>Assinantes têm acesso ilimitado a todos os temas e atmosferas customizadas.</Text>
          </View>
          <Pressable onPress={() => toast(COMING_SOON)} accessibilityRole="button" style={styles.unlock}>
            <Text style={styles.unlockText}>Desbloquear</Text>
          </Pressable>
        </LinearGradient>

        <View style={styles.sectionRow}>
          <Text style={styles.section}>ATMOSFERAS BÍBLICAS</Text>
          <Text style={styles.counter}>{BIBLE_THEMES.length} Estilos Disponíveis</Text>
        </View>

        <View style={styles.list} accessibilityRole="radiogroup">
          {BIBLE_THEMES.map((theme) => (
            <ThemeRow
              key={theme.id}
              theme={theme}
              selected={theme.id === pendingId}
              locked={!isThemeUnlocked(theme)}
              onPress={() => handlePressTheme(theme.id)}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={() => {
            onApply(pendingId);
            onClose();
          }}
          accessibilityRole="button"
          accessibilityLabel="Aplicar Tema Selecionado"
        >
          <LinearGradient colors={['#E8265E', '#F7568A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.apply}>
            <MaterialCommunityIcons name="check-all" size={20} color={colors.onPrimary} />
            <Text style={styles.applyText}>Aplicar Tema Selecionado</Text>
          </LinearGradient>
        </Pressable>
        <Pressable onPress={() => toast(COMING_SOON)} accessibilityRole="button">
          <Text style={styles.trial}>✨ Experimentar Premium por 7 dias grátis</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  headerTexts: { flex: 1 },
  title: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.onSurface },
  subtitle: { fontFamily: fonts.body, fontSize: 12, color: colors.onSurfaceVariant },
  close: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.lg },
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.lg, padding: spacing.lg },
  bannerTexts: { flex: 1, gap: 2 },
  bannerTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.onSurface },
  bannerBody: { fontFamily: fonts.body, fontSize: 11, lineHeight: 15, color: colors.onSurfaceVariant },
  unlock: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 8 },
  unlockText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.onPrimary },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  section: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.8, color: colors.onSurface },
  counter: { fontFamily: fonts.body, fontSize: 11, color: colors.onSurfaceVariant },
  list: { gap: spacing.md },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xl, gap: spacing.md, alignItems: 'stretch' },
  apply: { height: 54, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  applyText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.onPrimary },
  trial: { textAlign: 'center', fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.primary },
});
