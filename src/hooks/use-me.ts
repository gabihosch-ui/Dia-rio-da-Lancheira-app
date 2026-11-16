import { demoMe } from '@/data/demo/misc';
import { useAuth } from '@/state/auth';

export interface MeView {
  fullName: string;
  publicName: string;
  email: string;
  createdAt: string;
  initials: string;
  /** true quando o app está sem Supabase configurado (modo demonstração). */
  isDemo: boolean;
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '');
  return letters.toUpperCase() || '?';
}

/** Dados da pessoa para exibição: conta real quando logada, perfil fictício no modo demonstração. */
export function useMe(): MeView | null {
  const { isConfigured, account } = useAuth();
  if (!isConfigured) {
    return { ...demoMe, initials: demoMe.avatarInitials, isDemo: true };
  }
  if (!account) return null;
  return {
    fullName: account.fullName || account.publicName,
    publicName: account.publicName,
    email: account.email,
    createdAt: account.createdAt,
    initials: initialsOf(account.fullName || account.publicName),
    isDemo: false,
  };
}
