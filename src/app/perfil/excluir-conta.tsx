import { useState } from 'react';
import { View } from 'react-native';

import { CheckboxField, Field, FormMessage } from '@/components/ui/form';
import { AppText, Button, Card, Icon, Row, Screen } from '@/components/ui/primitives';
import { notify } from '@/lib/notify';
import { deleteMyAccount } from '@/services/account';
import { useAuth } from '@/state/auth';
import { colors, spacing } from '@/theme/tokens';

export default function DeleteAccountScreen() {
  const { account } = useAuth();
  const [password, setPassword] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!account) return;
    if (!password) {
      setError('Digite sua senha para confirmar.');
      return;
    }
    setLoading(true);
    setError(null);
    const r = await deleteMyAccount(account.email, password);
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    // A sessão foi encerrada: o app volta sozinho para a tela de entrada.
    notify('Conta excluída', 'Sua conta e seus dados foram excluídos.');
  }

  return (
    <Screen
      hasHeader
      footer={
        <Button
          label="Excluir minha conta"
          variant="danger"
          icon="trash-outline"
          fullWidth
          loading={loading}
          disabled={!understood || !password}
          onPress={submit}
        />
      }>
      <Card tone="danger" style={{ gap: spacing.md }}>
        <Row gap={spacing.sm}>
          <Icon name="warning" color={colors.danger} />
          <AppText variant="subtitle" color={colors.danger}>
            Esta ação é definitiva
          </AppText>
        </Row>
        <View style={{ gap: spacing.xs }}>
          <AppText>Ao excluir sua conta, apagamos imediatamente:</AppText>
          <AppText>• seu perfil (nome, nome público e e-mail de acesso);</AppText>
          <AppText>• suas preferências e notificações;</AppText>
          <AppText>• seus dados pessoais guardados no app.</AppText>
        </View>
        <AppText variant="caption" color={colors.textMuted}>
          Não é possível desfazer. Se você tiver uma assinatura, cancele-a também na App Store ou no Google Play: a
          exclusão da conta não cancela cobranças da loja.
        </AppText>
      </Card>

      <Field
        label="Sua senha"
        hint="Por segurança, confirme sua senha."
        value={password}
        onChangeText={setPassword}
        secure
        autoComplete="current-password"
        textContentType="password"
      />

      <CheckboxField checked={understood} onChange={setUnderstood} label="Entendo que a exclusão é definitiva">
        <AppText>Entendo que a exclusão é definitiva e não pode ser desfeita.</AppText>
      </CheckboxField>

      {error ? <FormMessage tone="error" text={error} /> : null}
    </Screen>
  );
}
