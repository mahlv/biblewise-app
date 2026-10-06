import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '../../theme/tokens';

/** Placeholder for the future Diary tab. */
export default function DiaryScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.title}>Diário em construção</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  title: { fontFamily: fonts.titleSemiBold, fontSize: 22, color: colors.onSurface },
});
