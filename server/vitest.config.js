import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // index.js가 정상 부팅 시 'dotenv/config'로 .env를 로드하는데, 테스트는 app.js를 직접 import해서
    // 그 경로를 거치지 않는다 — supabaseAdmin.js/supabaseAuthClient.js가 SUPABASE_URL 등을 필요로 하므로
    // 여기서 동일하게 로드해준다.
    setupFiles: ['dotenv/config'],
  },
})
