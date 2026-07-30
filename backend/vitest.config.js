import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        setupFiles: ['dotenv/config'],
        include: ['tests/**/*.test.js'],
        // 통합테스트가 실제 Supabase에 순차 요청을 여러 번 보내는 케이스가 있어(예: 재추천 다양화 테스트)
        // 기본 5000ms로는 원격 DB 지연이 큰 환경(Render 빌드 등)에서 타임아웃이 날 수 있다
        testTimeout: 15000,
    },
});
