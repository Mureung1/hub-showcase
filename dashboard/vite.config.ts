import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    sourcemap: false,
    minify: 'oxc',
    rollupOptions: {
      input: {
        main: new URL('./index.html', import.meta.url).pathname,
        guide: new URL('./guide/index.html', import.meta.url).pathname,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: './src/test-setup.ts',
  },
});
