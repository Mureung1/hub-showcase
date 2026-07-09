import { createApp } from "./app.js";
import { config, isAiConfigured } from "./config/env.js";

const app = createApp();

app.listen(config.port, () => {
  console.log(`[cv2pf] API listening on http://localhost:${config.port}`);
  console.log(`[cv2pf] AI 생성: ${isAiConfigured() ? "구성됨" : "미구성 (ANTHROPIC_API_KEY 없음)"}`);
});
