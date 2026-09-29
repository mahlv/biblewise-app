import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { BibleSearchScreen } from './screens/BibleSearchScreen';

/**
 * Cliente Convex do app.
 *
 * A URL do deployment é injetada pelo `npx convex dev` em `.env.local` como
 * `EXPO_PUBLIC_CONVEX_URL`. O prefixo `EXPO_PUBLIC_` é o que permite ao Metro
 * embutir a variável no bundle — nunca coloque segredos aqui, pois o valor vai
 * junto com o app instalado.
 *
 * `unsavedChangesWarning: false` evita um aviso em desenvolvimento quando as
 * funções locais ainda não foram enviadas ao deployment.
 */
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  // Falha explícita e cedo: sem a URL nenhuma query funciona, e um erro claro
  // aqui economiza muito tempo de depuração.
  throw new Error(
    'EXPO_PUBLIC_CONVEX_URL não definida. Rode `npx convex dev` na raiz do projeto para gerar o arquivo .env.local.',
  );
}

const convex = new ConvexReactClient(convexUrl, {
  unsavedChangesWarning: false,
});

export default function App() {
  return (
    <ConvexProvider client={convex}>
      <View style={styles.container}>
        <BibleSearchScreen />
        <StatusBar style="dark" />
      </View>
    </ConvexProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Fundo levemente pergaminho, remetendo a uma página de Bíblia.
    backgroundColor: '#FBF6EE',
  },
});
