import { createClient } from "@supabase/supabase-js";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";

dotenv.config({ path: "server/.env", quiet: true });

const app = express();
const port = Number(process.env.PORT) || 4000;
const configuredOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim());

app.use(
  cors({
    origin(origin, callback) {
      const isLocalDevelopmentOrigin =
        process.env.NODE_ENV !== "production" &&
        !!origin &&
        /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);

      if (!origin || configuredOrigins.includes(origin) || isLocalDevelopmentOrigin) {
        callback(null, true);
        return;
      }
      callback(new Error(`허용되지 않은 origin입니다: ${origin}`));
    },
  })
);
app.use(express.json());

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (
    !url ||
    !serviceRoleKey ||
    url.includes("YOUR_") ||
    serviceRoleKey.includes("YOUR_")
  ) {
    throw new Error("Supabase 서버 환경변수가 설정되지 않았습니다.");
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getErrorMessage(error: unknown, fallback: string) {
  if (
    error instanceof Error &&
    error.message === "Supabase 서버 환경변수가 설정되지 않았습니다."
  ) {
    return error.message;
  }
  return fallback;
}

function isUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getSourcePlatform(value: string) {
  const hostname = new URL(value).hostname.toLowerCase();
  if (hostname === "youtu.be" || hostname.endsWith("youtube.com")) return "youtube";
  if (hostname.endsWith("instagram.com")) return "instagram";
  if (hostname === "x.com" || hostname.endsWith(".x.com") || hostname.endsWith("twitter.com")) {
    return "twitter";
  }
  if (hostname.endsWith("naver.com")) return "naver";
  return "web";
}

app.get("/", (_request, response) => {
  response.json({
    message: "later API server",
    health: "/health",
    items: "/api/items",
  });
});

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.get("/api/items", async (_request, response) => {
  try {
    const { data, error } = await getSupabase()
      .from("items")
      .select("id, title, original_url, source_platform, category_main, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    response.json(data ?? []);
  } catch (error) {
    console.error("items 조회 실패:", error);
    response.status(500).json({
      error: getErrorMessage(error, "저장 목록을 불러오지 못했습니다."),
    });
  }
});

app.post("/api/items", async (request, response) => {
  const content = request.body?.content;
  if (typeof content !== "string" || !content.trim()) {
    response.status(400).json({ error: "content는 비어 있지 않은 문자열이어야 합니다." });
    return;
  }

  const trimmed = content.trim();
  const urlDetected = isUrl(trimmed);

  try {
    const { data, error } = await getSupabase()
      .from("items")
      .insert({
        type: urlDetected ? "link" : "text",
        original_url: urlDetected ? trimmed : null,
        title: urlDetected ? trimmed : trimmed.slice(0, 50),
        source_platform: urlDetected ? getSourcePlatform(trimmed) : "manual",
        category_main: "미분류",
        status: "unread",
      })
      .select("id, title, original_url, source_platform, category_main, created_at")
      .single();

    if (error) throw error;
    response.status(201).json(data);
  } catch (error) {
    console.error("item 저장 실패:", error);
    response.status(500).json({
      error: getErrorMessage(error, "항목을 저장하지 못했습니다."),
    });
  }
});

app.listen(port, () => {
  console.log(`Express server listening on http://localhost:${port}`);
});
