import { useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';

import { colors, layout, radius, spacing } from '@/theme/tokens';

import { AppText, Icon, Row } from './primitives';

interface FieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  hint?: string;
  error?: string | null;
  secure?: boolean;
}

/** Campo de formulário acessível, com rótulo visível, dica e mensagem de erro. */
export function Field({ label, hint, error, secure, ...input }: FieldProps) {
  const [hidden, setHidden] = useState(true);
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="caption" color={colors.textTitle} style={{ fontWeight: '700' }}>
        {label}
      </AppText>
      <Row
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          borderWidth: 1.5,
          borderColor: error ? colors.danger : colors.border,
          paddingHorizontal: spacing.md,
          minHeight: layout.minTouchTarget,
        }}>
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={hint}
          placeholderTextColor={colors.textSubtle}
          secureTextEntry={secure && hidden}
          autoCorrect={false}
          style={{ flex: 1, fontSize: 16, color: colors.text, paddingVertical: spacing.md }}
          {...input}
        />
        {secure ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Mostrar senha' : 'Ocultar senha'}
            hitSlop={10}>
            <Icon name={hidden ? 'eye-outline' : 'eye-off-outline'} color={colors.textSubtle} />
          </Pressable>
        ) : null}
      </Row>
      {error ? (
        <AppText variant="small" color={colors.danger} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="small" color={colors.textSubtle}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

export function FormMessage({ tone, text }: { tone: 'error' | 'success'; text: string }) {
  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: tone === 'error' ? colors.dangerSoft : colors.successSoft,
        borderRadius: radius.md,
        padding: spacing.md,
      }}>
      <AppText variant="caption" color={tone === 'error' ? colors.danger : colors.text}>
        {text}
      </AppText>
    </View>
  );
}

export function CheckboxField({
  checked,
  onChange,
  children,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      aria-checked={checked}
      style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', minHeight: layout.minTouchTarget }}>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          marginTop: 2,
          borderWidth: 2,
          borderColor: checked ? colors.accent : colors.borderStrong,
          backgroundColor: checked ? colors.accent : colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {checked ? <Icon name="checkmark" size={16} color={colors.textOnAccent} /> : null}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );
}
