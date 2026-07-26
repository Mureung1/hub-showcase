import { defineConfig } from "vitest/config";
import fs from "node:fs";
import path from "node:path";

// 통합 테스트(routes/**)가 실제 Supabase 테스트 프로젝트에 접속하려면 DATABASE_URL이
// 필요하다. server/.env.test가 있으면 그 값만 읽어 주입하고, 없으면 DATABASE_URL/
// DIRECT_URL을 빈 문자열로 명시 주입한다(비워두는 게 아니라 "" 로 못박는 이유는 아래 참고).
//
// 예전엔 vite의 loadEnv("test", ...)를 썼는데, vite는 .env.test가 없어도 항상 base
// .env(개발 DB의 실제 DATABASE_URL)를 먼저 읽어버리는 하드코딩된 동작이 있어서,
// ".env.test가 없으면 DATABASE_URL이 비어서 skip"이라는 가드 설계가 실제로는
// "DATABASE_URL은 있는데 test 식별자가 없어서 throw" 분기로 새는 버그가 있었다.
//
// loadEnv를 안 쓰는 것만으로는 부족하다 — @prisma/client는 import되는 순간(인스턴스화 전에도)
// 자체적으로 schema.prisma 근처의 .env를 자동 로드하는 부수효과가 있는데, 이 자동로드는
// process.env에 해당 키가 "이미 설정돼 있으면"(빈 문자열이어도) 절대 덮어쓰지 않는다.
// 그래서 .env.test가 없을 때 DATABASE_URL/DIRECT_URL을 그냥 비워두면(undefined) 테스트
// 파일이 app.js를 import하는 순간 Prisma가 실제 개발 DB의 .env를 몰래 채워버려서 가드가
// "DB 있음" 상태로 오판해 throw한다. 두 키를 빈 문자열로 명시 주입해 Prisma의 자동로드
// 자체를 막아야 가드가 진짜로 "DB 없음→skip" 분기를 타게 된다.
function loadTestEnv(): Record<string, string> {
  const envTestPath = path.resolve(process.cwd(), ".env.test");
  if (!fs.existsSync(envTestPath)) {
    return { DATABASE_URL: "", DIRECT_URL: "" };
  }

  const env: Record<string, string> = {};
  for (const line of fs.readFileSync(envTestPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: loadTestEnv(),
  },
});
