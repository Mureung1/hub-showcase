import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { loadEnv, type Plugin } from 'vite';

import { parseSupabaseEnv } from './src/shared/config/supabase_env';

type WebBuildEnvironment = Readonly<Record<string, string | undefined>>;

export function resolveWebBuildEnv(
  fileEnvironment: WebBuildEnvironment,
  processEnvironment: WebBuildEnvironment = process.env
) {
  return parseSupabaseEnv({
    ...fileEnvironment,
    ...processEnvironment,
  });
}

function validateSupabaseBuildEnv(): Plugin {
  return {
    name: 'validate-supabase-build-env',
    config(_config, { command, mode }) {
      if (command === 'build') {
        resolveWebBuildEnv(loadEnv(mode, process.cwd(), ''));
      }
    },
  };
}

export default defineConfig({
  plugins: [validateSupabaseBuildEnv(), react()],
  test: {
    exclude: [...configDefaults.exclude, '**/.worktrees/**'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: [{ find: '@', replacement: '/src' }],
  },
});
