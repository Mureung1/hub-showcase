import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// 컴포넌트 안의 순수 로직도 테스트할 수 있게 tsconfig의 "@/*" 별칭을 vitest에 연결한다.
// (도메인 테스트는 상대경로라 여태 없이도 됐지만, tsx가 쓰는 @/ import는 이게 있어야 풀린다)
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
