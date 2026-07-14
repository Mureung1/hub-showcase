import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// 공통 설정은 앱 루트 .env에서 읽고, 서버 전용 .env가 있으면 그 값으로 덮어쓴다.
dotenv.config({ path: path.resolve(serverRoot, "../.env") });
dotenv.config({ path: path.resolve(serverRoot, ".env"), override: true });

// 환경변수를 한 곳에서 읽어 검증한다. (형식/기본값은 여기서만 관리)
export const config = {
  port: Number(process.env.PORT) || 4000,
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || "",
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
  },
  supabase: {
    url: (process.env.SUPABASE_URL || "").replace(/\/$/, ""),
    secretKey:
      process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  },
};

// 키가 있어야 실제 생성이 동작한다. 없으면 서버는 뜨지만 /api/generate 는 503.
export const isAiConfigured = () => Boolean(config.anthropic.apiKey);

// DB가 없어도 결정적 렌더러는 동작한다. 저장·조회 API만 503으로 명확히 실패한다.
export const isSupabaseConfigured = () =>
  Boolean(config.supabase.url && config.supabase.secretKey);
