import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// Solar(Upstage)는 OpenAI 호환 API라 openai-compatible provider로 그대로 붙는다.
// https://api.upstage.ai/v1 - base_url, apiKey는 서버에서만 쓰이는 환경변수(.env.local)
const solarProvider = createOpenAICompatible({
  name: "solar",
  baseURL: "https://api.upstage.ai/v1",
  apiKey: process.env.UPSTAGE_API_KEY,
});

export const solar = solarProvider.chatModel("solar-pro2");
