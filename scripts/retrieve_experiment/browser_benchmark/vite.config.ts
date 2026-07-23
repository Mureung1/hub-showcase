import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  server: {
    fs: {
      allow: [fileURLToPath(new URL('../../..', import.meta.url))],
    },
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
  },
});
