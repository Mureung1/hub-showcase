import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/__tests__/setup.ts'],
      // server/는 자체 Node 환경 Vitest 스위트(별도 실행)라 프론트 설정에서는 제외한다.
      include: ['src/**/*.test.{ts,tsx}'],
      exclude: ['server/**', 'node_modules/**'],
    },
  }),
)
