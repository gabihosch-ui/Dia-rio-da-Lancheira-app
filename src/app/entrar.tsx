import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { LogoPlaceholder } from '@/components/ui/brand';
import { Field, FormMessage } from '@/components/ui/form';
import { AppText, Button, Screen } from '@/components/ui/primitives';
import { isValidEmail } from '@/lib/auth-errors';
import { useAuth } from '@/state/auth';
import { colors, spacing } from '@/theme/tokens';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!isValidEmail(email) || !password) {
      setError('Informe seu e-mail e sua senha.');
      return;
    }
    setLoading(true);
    setError(null);
    const r = await signIn(email, password);
    setLoading(false);
    // Em caso de sucesso, a navegação muda sozinha (rotas protegidas).
    if (!r.ok) setError(r.message);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <View style={{ gap: spacing.lg, paddingTop: spacing.xl }}>
          <LogoPlaceholder />
          <AppText variant="display">Que bom ter você aqui!</AppText>
          <AppText color={colors.textMuted}>Entre para acessar receitas, Planejador e comunidade.</AppText>
        </View>

        <View style={{ gap: spacing.lg }}>
          <Field
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            placeholder="seu@email.com"
          />
          <Field
            label="Senha"
            value={password}
            onChangeText={setPassword}
            secure
            autoComplete="current-password"
            textContentType="password"
            onSubmitEditing={submit}
            returnKeyType="go"
          />
          {error ? <FormMessage tone="error" text={error} /> : null}
          <Button label="Entrar" fullWidth loading={loading} onPress={submit} />
          <Link href="/recuperar-senha" style={{ alignSelf: 'center', padding: spacing.sm }}>
            <AppText variant="caption" color={colors.accent} style={{ fontWeight: '700' }}>
              Esqueci minha senha
            </AppText>
          </Link>
        </View>

        <View style={{ gap: spacing.sm, alignItems: 'center' }}>
          <AppText color={colors.textMuted}>Ainda não tem conta?</AppText>
          <Link href="/cadastro" asChild>
            <Button label="Criar conta" variant="secondary" fullWidth />
          </Link>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
