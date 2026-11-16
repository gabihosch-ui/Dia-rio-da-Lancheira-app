import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { AppText, Button, Icon } from '@/components/ui/primitives';
import type { RecipeVideoInfo } from '@/domain/models';
import { formatDuration } from '@/lib/recipes';
import { services, type VideoTokenResult } from '@/services';
import { colors, radius, spacing } from '@/theme/tokens';

const MESSAGES: Record<Exclude<VideoTokenResult, { ok: true }>['reason'], string> = {
  unavailable: 'O vídeo desta receita ainda não está disponível.',
  not_configured: 'Os vídeos protegidos ainda estão sendo configurados. Em breve você poderá assistir aqui.',
  denied: 'O vídeo é exclusivo do Clube.',
  rate_limited: 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.',
  error: 'Não foi possível carregar o vídeo. Verifique sua conexão.',
};

const BOX = {
  aspectRatio: 16 / 9,
  borderRadius: radius.lg,
  backgroundColor: colors.textTitle,
  overflow: 'hidden' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

/**
 * Vídeo da receita. O endereço de reprodução é temporário e só é pedido ao
 * servidor quando a pessoa toca em "Assistir" (o servidor confere o direito).
 */
export function RecipeVideo({ recipeId, video }: { recipeId: string; video: RecipeVideoInfo }) {
  const [phase, setPhase] = useState<
    { kind: 'idle' } | { kind: 'loading' } | { kind: 'ready'; url: string } | { kind: 'error'; message: string }
  >({ kind: 'idle' });

  async function start() {
    setPhase({ kind: 'loading' });
    const r = await services.recipes.requestVideo(recipeId);
    setPhase(r.ok ? { kind: 'ready', url: r.url } : { kind: 'error', message: MESSAGES[r.reason] });
  }

  if (video.status !== 'pronto') {
    return (
      <View style={[BOX, { gap: spacing.sm, padding: spacing.lg }]}>
        <Icon name="videocam-off-outline" size={36} color={colors.surface} />
        <AppText variant="caption" color={colors.surface} align="center">
          {MESSAGES.unavailable}
        </AppText>
      </View>
    );
  }

  if (phase.kind === 'ready') {
    // Ao expirar o endereço temporário, o player mostra erro e oferece pedir um novo.
    return <Player key={phase.url} url={phase.url} onExpired={start} />;
  }

  const duration = formatDuration(video.durationSeconds);
  return (
    <Pressable
      onPress={phase.kind === 'loading' ? undefined : start}
      accessibilityRole="button"
      accessibilityLabel={`Assistir ao vídeo da receita${duration ? `, ${duration}` : ''}`}
      style={[BOX, { gap: spacing.sm, padding: spacing.lg }]}>
      {phase.kind === 'loading' ? (
        <ActivityIndicator color={colors.primary} size="large" />
      ) : (
        <Icon name="play-circle" size={64} color={colors.primary} />
      )}
      <AppText variant="caption" color={colors.surface} align="center">
        {phase.kind === 'error'
          ? phase.message
          : phase.kind === 'loading'
            ? 'Preparando o vídeo…'
            : `Assistir${duration ? ` · ${duration}` : ''}`}
      </AppText>
      {phase.kind === 'error' ? (
        <AppText variant="small" color={colors.primary}>
          Tocar para tentar de novo
        </AppText>
      ) : null}
    </Pressable>
  );
}

function Player({ url, onExpired }: { url: string; onExpired: () => void }) {
  const player = useVideoPlayer(url, (p) => {
    p.play();
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status });

  if (status === 'error') {
    return (
      <View style={[BOX, { gap: spacing.md, padding: spacing.lg }]}>
        <Icon name="alert-circle-outline" size={36} color={colors.surface} />
        <AppText variant="caption" color={colors.surface} align="center">
          A reprodução foi interrompida (o acesso pode ter expirado).
        </AppText>
        <Button label="Carregar de novo" small onPress={onExpired} />
      </View>
    );
  }

  return (
    <View style={BOX}>
      <VideoView
        player={player}
        style={{ width: '100%', height: '100%' }}
        nativeControls
        contentFit="contain"
        fullscreenOptions={{ enable: true }}
        accessibilityLabel="Vídeo da receita"
      />
      {status === 'loading' ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ position: 'absolute' }} />
      ) : null}
    </View>
  );
}
