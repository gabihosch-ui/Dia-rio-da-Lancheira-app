import { secureSessionStorage } from './secure-session-storage';

const mockStore = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => {
    if (!/^[A-Za-z0-9._-]+$/.test(k)) throw new Error(`chave inválida: ${k}`);
    if (v.length > 2048) throw new Error('valor grande demais');
    mockStore.set(k, v);
  }),
  deleteItemAsync: jest.fn(async (k: string) => {
    mockStore.delete(k);
  }),
}));

jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

const KEY = 'sb-abcd-auth-token';

beforeEach(() => mockStore.clear());

describe('secureSessionStorage', () => {
  it('guarda e lê sessões maiores que 2 KB em pedaços', async () => {
    const big = 'x'.repeat(5000);
    await secureSessionStorage.setItem(KEY, big);
    expect(await secureSessionStorage.getItem(KEY)).toBe(big);
    expect([...mockStore.keys()].length).toBeGreaterThan(2);
  });

  it('ao regravar um valor menor, não deixa pedaços antigos', async () => {
    await secureSessionStorage.setItem(KEY, 'a'.repeat(5000));
    await secureSessionStorage.setItem(KEY, 'curto');
    expect(await secureSessionStorage.getItem(KEY)).toBe('curto');
    expect(mockStore.size).toBe(2); // contador + 1 pedaço
  });

  it('remove tudo ao sair', async () => {
    await secureSessionStorage.setItem(KEY, 'y'.repeat(4000));
    await secureSessionStorage.removeItem(KEY);
    expect(mockStore.size).toBe(0);
    expect(await secureSessionStorage.getItem(KEY)).toBeNull();
  });

  it('chaves com caracteres não permitidos são normalizadas', async () => {
    await secureSessionStorage.setItem('sb:auth/token', 'ok');
    expect(await secureSessionStorage.getItem('sb:auth/token')).toBe('ok');
  });
});
