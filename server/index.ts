import { createClient } from "@supabase/supabase-js";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import {
  classifyWithFallback,
  createConfiguredGeminiClassifier,
} from "./geminiClassification";
import { handleImageUpload } from "./imageUpload";
import {
  getStoragePathFromPublicUrl,
  removeItemImage,
  uploadItemImage,
} from "./imageStorage";
import { extractPageMetadata, type PageMetadata } from "./metadata";
import { isSupportedImageType } from "../lib/image";

dotenv.config({ path: "server/.env", quiet: true });

const app = express();
const port = Number(process.env.PORT) || 4000;
const itemColumns =
  "id, title, content, original_url, image_url, source_platform, category_main, category_sub, created_at";
const configuredOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim());
const geminiClassifier = createConfiguredGeminiClassifier();
const storageBucket = process.env.SUPABASE_STORAGE_BUCKET?.trim();

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

function parseItemId(value: string) {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
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
  if (
    hostname === "youtu.be" ||
    hostname === "youtube.com" ||
    hostname.endsWith(".youtube.com")
  ) {
    return "youtube";
  }
  if (hostname === "instagram.com" || hostname.endsWith(".instagram.com")) return "instagram";
  if (
    hostname === "x.com" ||
    hostname.endsWith(".x.com") ||
    hostname === "twitter.com" ||
    hostname.endsWith(".twitter.com")
  ) {
    return "twitter";
  }
  if (hostname === "naver.com" || hostname.endsWith(".naver.com")) return "naver";
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
      .select(itemColumns)
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

app.post("/api/items", handleImageUpload, async (request, response) => {
  const content = request.body?.content;
  if (content !== undefined && typeof content !== "string") {
    response.status(400).json({ error: "content는 문자열이어야 합니다." });
    return;
  }

  const trimmed = typeof content === "string" ? content.trim() : "";
  if (!trimmed && !request.file) {
    response.status(400).json({ error: "content 또는 image가 필요합니다." });
    return;
  }
  if (request.file && !storageBucket) {
    response.status(500).json({ error: "Supabase Storage 버킷이 설정되지 않았습니다." });
    return;
  }
  if (request.file && !isSupportedImageType(request.file.mimetype)) {
    response.status(415).json({ error: "지원하지 않는 이미지 형식입니다." });
    return;
  }

  const urlDetected = isUrl(trimmed);
  const sourcePlatform = urlDetected ? getSourcePlatform(trimmed) : "manual";
  let metadata: PageMetadata | null = null;
  if (urlDetected && geminiClassifier) {
    try {
      metadata = await extractPageMetadata(trimmed);
    } catch (error) {
      console.warn("메타데이터 추출 실패, 원문으로 분류를 계속합니다:", error);
    }
  }
  const classificationImage =
    request.file && isSupportedImageType(request.file.mimetype)
      ? {
          data: request.file.buffer.toString("base64"),
          mimeType: request.file.mimetype,
        }
      : null;
  const { categoryMain, categorySub } = await classifyWithFallback(
    { content: trimmed, metadata, image: classificationImage },
    geminiClassifier
  );

  let uploadedImagePath: string | null = null;
  try {
    const supabase = getSupabase();
    let imageUrl: string | null = null;
    if (request.file && storageBucket && isSupportedImageType(request.file.mimetype)) {
      const uploadedImage = await uploadItemImage(supabase, storageBucket, {
        buffer: request.file.buffer,
        mimetype: request.file.mimetype,
      });
      uploadedImagePath = uploadedImage.path;
      imageUrl = uploadedImage.publicUrl;
    }

    const { data, error } = await supabase
      .from("items")
      .insert({
        type: request.file ? "image" : urlDetected ? "link" : "text",
        original_url: urlDetected ? trimmed : null,
        image_url: imageUrl,
        content: trimmed || null,
        title: urlDetected ? trimmed : trimmed.slice(0, 50) || "이미지",
        source_platform: sourcePlatform,
        category_main: categoryMain,
        category_sub: categorySub,
        status: "unread",
      })
      .select(itemColumns)
      .single();

    if (error) throw error;
    response.status(201).json(data);
  } catch (error) {
    if (uploadedImagePath && storageBucket) {
      try {
        await removeItemImage(getSupabase(), storageBucket, uploadedImagePath);
      } catch (cleanupError) {
        console.error("저장 실패 후 이미지 정리 실패:", cleanupError);
      }
    }
    console.error("item 저장 실패:", error);
    response.status(500).json({
      error:
        request.file && !uploadedImagePath
          ? "이미지를 Supabase Storage에 업로드하지 못했습니다."
          : getErrorMessage(error, "항목을 저장하지 못했습니다."),
    });
  }
});

function respondToMissingItemId(
  _request: express.Request,
  response: express.Response
) {
  response.status(400).json({ error: "id가 필요합니다." });
}

app.patch("/api/items", respondToMissingItemId);
app.delete("/api/items", respondToMissingItemId);

app.patch("/api/items/:id", async (request, response) => {
  const id = parseItemId(request.params.id);
  if (id === null) {
    response.status(400).json({ error: "id는 양의 정수여야 합니다." });
    return;
  }

  const title = request.body?.title;
  if (typeof title !== "string" || !title.trim()) {
    response.status(400).json({ error: "title은 비어 있지 않은 문자열이어야 합니다." });
    return;
  }

  try {
    const { data, error } = await getSupabase()
      .from("items")
      .update({ title: title.trim() })
      .eq("id", id)
      .select(itemColumns)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      response.status(404).json({ error: "항목을 찾을 수 없습니다." });
      return;
    }
    response.json(data);
  } catch (error) {
    console.error("item 수정 실패:", error);
    response.status(500).json({
      error: getErrorMessage(error, "항목을 수정하지 못했습니다."),
    });
  }
});

app.delete("/api/items/:id", async (request, response) => {
  const id = parseItemId(request.params.id);
  if (id === null) {
    response.status(400).json({ error: "id는 양의 정수여야 합니다." });
    return;
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("items")
      .delete()
      .eq("id", id)
      .select("id, image_url")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      response.status(404).json({ error: "항목을 찾을 수 없습니다." });
      return;
    }
    if (data.image_url && storageBucket) {
      const imagePath = getStoragePathFromPublicUrl(data.image_url, storageBucket);
      if (imagePath) {
        try {
          await removeItemImage(supabase, storageBucket, imagePath);
        } catch (error) {
          console.error("삭제된 항목의 이미지 정리 실패:", error);
        }
      }
    }
    response.json({ success: true, id: data.id });
  } catch (error) {
    console.error("item 삭제 실패:", error);
    response.status(500).json({
      error: getErrorMessage(error, "항목을 삭제하지 못했습니다."),
    });
  }
});

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`Express server listening on http://localhost:${port}`);
  });
}

export { app };
