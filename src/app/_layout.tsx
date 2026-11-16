import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/state/auth';
import { DemoStoreProvider } from '@/state/demo-store';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

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
        <AuthProvider>
          <DemoStoreProvider>
            <StatusBar style="dark" />
            <RootNavigator />
          </DemoStoreProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { isConfigured, isLoading, session } = useAuth();

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync();
  }, [isLoading]);

  if (isLoading) return null;

  // Sem .env do Supabase o app abre no modo demonstração (sem login), como na Fase 1.
  const signedIn = isConfigured ? !!session : true;

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.textTitle,
        headerTitleStyle: { fontWeight: '800' },
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="receita/[id]" options={{ title: '' }} />
        <Stack.Screen name="planejador/[id]" options={{ title: 'Planejador' }} />
        <Stack.Screen name="comunidade/[id]" options={{ title: 'Publicação' }} />
        <Stack.Screen name="comunidade/nova" options={{ title: 'Nova publicação', presentation: 'modal' }} />
        <Stack.Screen name="assinatura" options={{ title: 'Meu plano e assinatura' }} />
        <Stack.Screen name="notificacoes" options={{ title: 'Notificações' }} />
        <Stack.Screen name="perfil/editar" options={{ title: 'Editar perfil' }} />
        <Stack.Screen name="perfil/excluir-conta" options={{ title: 'Excluir conta' }} />
      </Stack.Protected>

      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="entrar" options={{ headerShown: false }} />
        <Stack.Screen name="cadastro" options={{ title: 'Criar conta' }} />
        <Stack.Screen name="recuperar-senha" options={{ title: 'Recuperar senha' }} />
      </Stack.Protected>

      {/* Aberta pelo link do e-mail de recuperação, com ou sem sessão. */}
      <Stack.Screen name="redefinir-senha" options={{ title: 'Nova senha' }} />
    </Stack>
  );
}
