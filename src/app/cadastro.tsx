import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { CheckboxField, Field, FormMessage } from '@/components/ui/form';
import { AppText, Button, Card, Screen } from '@/components/ui/primitives';
import { isValidEmail, validatePassword } from '@/lib/auth-errors';
import { validateNames } from '@/services/account';
import { useAuth } from '@/state/auth';
import { colors, spacing } from '@/theme/tokens';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [publicName, setPublicName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAdult, setIsAdult] = useState(false);
  const [acceptsTerms, setAcceptsTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const passwordError = password ? validatePassword(password) : null;

  async function submit() {
    const problem =
      validateNames(fullName, publicName) ??
      (isValidEmail(email) ? null : 'Confira o e-mail digitado.') ??
      validatePassword(password) ??
      (isAdult ? null : 'O cadastro é destinado a pessoas com 18 anos ou mais.') ??
      (acceptsTerms ? null : 'É preciso aceitar os Termos de uso e a Política de privacidade.');
    if (problem) {
      setError(problem);
      return;
    }
    setLoading(true);
    setError(null);
    const r = await signUp({ email, password, fullName, publicName });
    setLoading(false);
    if (!r.ok) setError(r.message);
    else if (r.needsEmailConfirmation) setCheckEmail(true);
    // Se não precisa confirmar, a sessão abre e a navegação muda sozinha.
  }

  if (checkEmail) {
    return (
      <Screen hasHeader>
        <Card tone="success" style={{ gap: spacing.md }}>
          <AppText variant="subtitle">Confira seu e-mail</AppText>
          <AppText>
            Enviamos um link de confirmação para {email.trim()}. Depois de confirmar, volte aqui e entre com seu e-mail
            e senha.
          </AppText>
        </Card>
        <Button label="Ir para o login" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen hasHeader footer={<Button label="Criar conta" fullWidth loading={loading} onPress={submit} />}>
        <Field label="Seu nome" value={fullName} onChangeText={setFullName} autoComplete="name" maxLength={120} />
        <Field
          label="Nome público"
          hint="É como você aparece na comunidade. Pode ser só o primeiro nome."
          value={publicName}
          onChangeText={setPublicName}
          maxLength={40}
        />
        <Field
          label="E-mail"
          hint="Fica privado: ninguém da comunidade vê."
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <Field
          label="Senha"
          hint="Mínimo de 8 caracteres, com letras e números."
          error={passwordError}
          value={password}
          onChangeText={setPassword}
          secure
          autoComplete="new-password"
          textContentType="newPassword"
        />

        <View style={{ gap: spacing.sm }}>
          <CheckboxField checked={isAdult} onChange={setIsAdult} label="Tenho 18 anos ou mais">
            <AppText>Tenho 18 anos ou mais.</AppText>
          </CheckboxField>
          <CheckboxField
            checked={acceptsTerms}
            onChange={setAcceptsTerms}
            label="Aceito os Termos de uso e a Política de privacidade">
            <AppText>
              Li e aceito os Termos de uso e a Política de privacidade.{' '}
              <AppText variant="small" color={colors.textSubtle}>
                (textos definitivos na Fase 7)
              </AppText>
            </AppText>
          </CheckboxField>
        </View>

        {error ? <FormMessage tone="error" text={error} /> : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}
