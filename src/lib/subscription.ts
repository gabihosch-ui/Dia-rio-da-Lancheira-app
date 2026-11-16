import type { SubscriptionState } from '@/domain/models';

export const SUBSCRIPTION_LABEL: Record<
  SubscriptionState,
  { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }
> = {
  nenhuma: { label: 'Sem assinatura', tone: 'neutral' },
  ativa: { label: 'Assinatura ativa', tone: 'success' },
  em_recuperacao: { label: 'Problema no pagamento', tone: 'warning' },
  cancelada_ate_fim: { label: 'Cancelada (acesso até o fim do período)', tone: 'warning' },
  expirada: { label: 'Assinatura expirada', tone: 'danger' },
};
