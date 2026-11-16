import { demoServices } from './demo';
import type { Services } from './types';

/**
 * Ponto único de acesso aos dados. Fase 1: sempre a implementação demonstrativa.
 * Fase 2: escolher a implementação Supabase por variável de ambiente.
 */
export const services: Services = demoServices;

export const IS_DEMO_DATA = true;

export * from './types';
