/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** LÃª variÃ¡veis de .env e .env.test (nÃ£o versionados) sem dependÃªncias extras. */
function loadEnvFile(name: string): Record<string, string> {
  try {
    const text = readFileSync(join(__dirname, '..', '..', name), 'utf8');
    const out: Record<string, string> = {};
    for (const line of text.split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m) out[m[1]] = m[2];
    }
    return out;
  } catch {
    return {};
  }
}

const env = { ...loadEnvFile('.env'), ...loadEnvFile('.env.test'), ...process.env } as Record<
  string,
  string | undefined
>;

function required(key: string): string {
  const v = env[key];
  if (!v) throw new Error(`VariÃ¡vel ${key} ausente (.env / .env.test).`);
  return v;
}

export const testEnv = {
  url: required('EXPO_PUBLIC_SUPABASE_URL'),
  anonKey: required('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  userA: { email: required('TEST_USER_A_EMAIL'), password: required('TEST_USER_A_PASSWORD') },
  userB: { email: required('TEST_USER_B_EMAIL'), password: required('TEST_USER_B_PASSWORD') },
  /** Conta comum que recebe o papel de admin manualmente (ver docs/SEGURANCA.md). */
  get admin() {
    return { email: required('TEST_ADMIN_EMAIL'), password: required('TEST_ADMIN_PASSWORD') };
  },
};
