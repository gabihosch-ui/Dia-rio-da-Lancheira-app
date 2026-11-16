import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { Field, FormMessage } from '@/components/ui/form';
import { AppText, Button, Screen } from '@/components/ui/primitives';
import { LoadingState } from '@/components/ui/states';
import { validatePassword } from '@/lib/auth-errors';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from '@/state/auth';
import { colors } from '@/theme/tokens';

/** Lê access_token/refresh_token do fragmento (#) do link de recuperação. */
function tokensFromUrl(url: string | null) {
  if (!url) return null;
  const hash = url.split('#')[1];
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  return access_token && refresh_token ? { access_token, refresh_token } : null;
}

export default function ResetPasswordScreen() {
  const url = Linking.useLinkingURL();
  const { session, updatePassword } = useAuth();
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (session) return;
    const tokens = tokensFromUrl(url);
    if (!tokens) return;
    getSupabase()
      .auth.setSession(tokens)
      .then(({ error: e }) => {
        if (e) setLinkError('Este link expirou ou já foi usado. Peça um novo na tela de login.');
      });
  }, [url, session]);

  async function submit() {
    const problem = validatePassword(password);
    if (problem) {
      setError(problem);
      return;
    }
    setLoading(true);
    const r = await updatePassword(password);
    setLoading(false);
    if (r.ok) setDone(true);
    else setError(r.message);
  }

  if (linkError) {
    return (
      <Screen hasHeader>
        <FormMessage tone="error" text={linkError} />
        <Button label="Voltar" onPress={() => router.replace('/')} />
      </Screen>
    );
  }
  if (!session) {
    return (
      <Screen hasHeader>
        <LoadingState label="Validando o link…" />
        <AppText color={colors.textMuted} align="center">
          Abra esta tela pelo link enviado ao seu e-mail.
        </AppText>
      </Screen>
    );
  }
  if (done) {
    return (
      <Screen hasHeader>
        <FormMessage tone="success" text="Senha alterada com sucesso." />
        <Button label="Continuar" onPress={() => router.replace('/')} />
      </Screen>
    );
  }
  return (
    <Screen hasHeader>
      <AppText color={colors.textMuted}>Crie uma nova senha para a sua conta.</AppText>
      <Field
        label="Nova senha"
        hint="Mínimo de 8 caracteres, com letras e números."
        value={password}
        onChangeText={setPassword}
        secure
        autoComplete="new-password"
        textContentType="newPassword"
      />
      {error ? <FormMessage tone="error" text={error} /> : null}
      <Button label="Salvar nova senha" fullWidth loading={loading} onPress={submit} />
    </Screen>
  );
}
