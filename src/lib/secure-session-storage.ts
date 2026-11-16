import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Armazenamento da sessão do Supabase.
 * - iOS/Android: Keychain/Keystore via expo-secure-store. Como algumas versões
 *   do iOS recusam valores acima de ~2 KB e a sessão costuma passar disso,
 *   o valor é dividido em pedaços.
 * - Web (apenas prévia de desenvolvimento): localStorage do navegador.
 */

const CHUNK_SIZE = 1800;

/** SecureStore aceita apenas letras, números, ".", "-" e "_" nas chaves. */
function safeKey(key: string) {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

const countKey = (key: string) => `${safeKey(key)}.n`;
const chunkKey = (key: string, i: number) => `${safeKey(key)}.${i}`;

async function removeChunks(key: string) {
  const count = Number((await SecureStore.getItemAsync(countKey(key))) ?? 0);
  for (let i = 0; i < count; i++) await SecureStore.deleteItemAsync(chunkKey(key, i));
  await SecureStore.deleteItemAsync(countKey(key));
}

export const secureSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null;
    const count = Number((await SecureStore.getItemAsync(countKey(key))) ?? 0);
    if (!count) return null;
    const parts: string[] = [];
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(chunkKey(key, i));
      if (part == null) return null; // armazenamento incompleto: trata como sem sessão
      parts.push(part);
    }
    return parts.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(key, value);
      return;
    }
    await removeChunks(key);
    const count = Math.ceil(value.length / CHUNK_SIZE);
    for (let i = 0; i < count; i++) {
      await SecureStore.setItemAsync(chunkKey(key, i), value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
    }
    await SecureStore.setItemAsync(countKey(key), String(count));
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.removeItem(key);
      return;
    }
    await removeChunks(key);
  },
};
