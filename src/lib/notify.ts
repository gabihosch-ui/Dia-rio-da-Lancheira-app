import { Alert, Platform } from 'react-native';

/**
 * Mensagem simples ao usuário. No web, o Alert do React Native não aparece,
 * então usamos o alerta do navegador para que a prévia web mostre o aviso.
 */
export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') {
    globalThis.alert?.([title, message].filter(Boolean).join('\n\n'));
    return;
  }
  Alert.alert(title, message, [{ text: 'Entendi' }]);
}

/** Aviso padrão para ações que só existirão em fases futuras. */
export function notYet(feature: string, phase: string) {
  notify(feature, `Esta função será implementada na ${phase}. Neste protótipo nada é enviado ou salvo em servidor.`);
}
