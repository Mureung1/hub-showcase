import { defineConfig } from 'vitest/config'

// 루트의 프론트엔드 vitest.config.ts(jsdom, 프론트 setup 파일)와 섞이지 않도록 서버 전용 설정을 따로 둔다.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
