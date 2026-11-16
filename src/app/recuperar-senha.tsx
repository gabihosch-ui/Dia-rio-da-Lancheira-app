import { useState } from 'react';

import { Field, FormMessage } from '@/components/ui/form';
import { AppText, Button, Screen } from '@/components/ui/primitives';
import { isValidEmail } from '@/lib/auth-errors';
import { useAuth } from '@/state/auth';
import { colors } from '@/theme/tokens';

export default function ForgotPasswordScreen() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit() {
    if (!isValidEmail(email)) {
      setError('Confira o e-mail digitado.');
      return;
    }
    setLoading(true);
    setError(null);
    const r = await requestPasswordReset(email);
    setLoading(false);
    if (r.ok) setSent(true);
    else setError(r.message);
  }

  return (
    <Screen hasHeader>
      <AppText color={colors.textMuted}>
        Informe o e-mail da sua conta. Se ele estiver cadastrado, você receberá um link para criar uma nova senha.
      </AppText>
      <Field
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        editable={!sent}
      />
      {error ? <FormMessage tone="error" text={error} /> : null}
      {sent ? (
        <FormMessage tone="success" text="Pronto! Se houver uma conta com este e-mail, o link chegará em instantes." />
      ) : (
        <Button label="Enviar link" fullWidth loading={loading} onPress={submit} />
      )}
    </Screen>
  );
}
