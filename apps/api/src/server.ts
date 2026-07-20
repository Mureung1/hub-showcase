import "dotenv/config";

import { app } from "./app.js";
import { loadEnv } from "./shared/config/env.js";

// 서버 시작 시 환경변수를 검증한다 (SPEC-AUTH-003 2.1). 필수 값이 없으면 명확히 실패시킨다.
let env;
try {
  env = loadEnv();
} catch (error) {
  console.error(
    `[api] ${error instanceof Error ? error.message : "환경변수 검증 실패"}`,
  );
  process.exit(1);
}

app.listen(env.PORT, () => {
  console.log(`Decision Log API running at http://localhost:${env.PORT}`);
});