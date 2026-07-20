import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";

// 통합 테스트(routes/**)가 실제 Supabase 테스트 프로젝트에 접속하려면 DATABASE_URL이
// 필요하다. loadEnv("test", ...)는 server/.env.test(있으면)를 server/.env 위에 덧씌워
// 로드한다 — .env.test가 없으면 평소 .env(개발 DB)만 로드되는데, 이 경우 DATABASE_URL에
// "test" 식별자가 없어 통합 테스트의 DB 가드가 실행을 거부한다(의도된 안전 기본값).
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: loadEnv("test", process.cwd(), ""),
  },
});
