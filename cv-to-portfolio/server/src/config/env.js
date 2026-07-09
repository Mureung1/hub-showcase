import "dotenv/config";

// 환경변수를 한 곳에서 읽어 검증한다. (형식/기본값은 여기서만 관리)
export const config = {
  port: Number(process.env.PORT) || 4000,
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || "",
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
  },
};

// 키가 있어야 실제 생성이 동작한다. 없으면 서버는 뜨지만 /api/generate 는 503.
export const isAiConfigured = () => Boolean(config.anthropic.apiKey);
