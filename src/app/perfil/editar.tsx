import { router } from 'expo-router';
import { useState } from 'react';

import { Field, FormMessage } from '@/components/ui/form';
import { AppText, Button, Screen } from '@/components/ui/primitives';
import { LoadingState } from '@/components/ui/states';
import { NAME_LIMITS, updateMyNames, validateNames } from '@/services/account';
import { useAuth } from '@/state/auth';
import { colors } from '@/theme/tokens';

export default function EditProfileScreen() {
  const { account, refreshAccount } = useAuth();
  if (!account)
    return (
      <Screen hasHeader>
        <LoadingState />
      </Screen>
    );
  return (
    <EditForm
      key={account.id}
      initialFull={account.fullName}
      initialPublic={account.publicName}
      userId={account.id}
      onSaved={refreshAccount}
    />
  );
}

function EditForm({
  initialFull,
  initialPublic,
  userId,
  onSaved,
}: {
  initialFull: string;
  initialPublic: string;
  userId: string;
  onSaved: () => Promise<void>;
}) {
  const [fullName, setFullName] = useState(initialFull);
  const [publicName, setPublicName] = useState(initialPublic);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const problem = validateNames(fullName, publicName);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateMyNames(userId, fullName, publicName);
      await onSaved();
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen hasHeader footer={<Button label="Salvar" fullWidth loading={saving} onPress={save} />}>
      <Field label="Seu nome" value={fullName} onChangeText={setFullName} maxLength={NAME_LIMITS.fullMax} />
      <Field
        label="Nome público"
        hint="Aparece na comunidade."
        value={publicName}
        onChangeText={setPublicName}
        maxLength={NAME_LIMITS.publicMax}
      />
      <AppText variant="caption" color={colors.textMuted}>
        A troca de foto de perfil chega junto com o envio de imagens da comunidade (Fase 6).
      </AppText>
      {error ? <FormMessage tone="error" text={error} /> : null}
    </Screen>
  );
}
