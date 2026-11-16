import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DemoStoreProvider } from '@/state/demo-store';
import { colors } from '@/theme/tokens';

const BrandTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.textTitle,
    primary: colors.accent,
    border: colors.border,
  },
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider value={BrandTheme}>
        <DemoStoreProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerTintColor: colors.textTitle,
              headerTitleStyle: { fontWeight: '800' },
              headerBackButtonDisplayMode: 'minimal',
              headerShadowVisible: false,
              headerStyle: { backgroundColor: colors.background },
              contentStyle: { backgroundColor: colors.background },
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="receita/[id]" options={{ title: '' }} />
            <Stack.Screen name="planejador/[id]" options={{ title: 'Planejador' }} />
            <Stack.Screen name="comunidade/[id]" options={{ title: 'Publicação' }} />
            <Stack.Screen name="comunidade/nova" options={{ title: 'Nova publicação', presentation: 'modal' }} />
            <Stack.Screen name="assinatura" options={{ title: 'Meu plano e assinatura' }} />
            <Stack.Screen name="notificacoes" options={{ title: 'Notificações' }} />
          </Stack>
        </DemoStoreProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
