import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: { port: 5180 },
  // Só variáveis com este prefixo vão para o navegador (nunca chaves secretas).
  envPrefix: 'VITE_PUBLIC_',
});
