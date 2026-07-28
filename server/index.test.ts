import type { Express } from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  inserted: null as Record<string, unknown> | null,
  updated: null as Record<string, unknown> | null,
  selectedArchived: null as boolean | null,
  upload: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: (_column: string, archived: boolean) => {
          database.selectedArchived = archived;
          return {
            order: async () => ({ data: [], error: null }),
          };
        },
      }),
      insert: (payload: Record<string, unknown>) => {
        database.inserted = payload;
        return {
          select: () => ({
            single: async () => ({
              data: {
                id: 1,
                ...payload,
                created_at: "2026-07-23T00:00:00.000Z",
              },
              error: null,
            }),
          }),
        };
      },
      update: (payload: Record<string, unknown>) => {
        database.updated = payload;
        return {
          eq: () => ({
            select: () => ({
              maybeSingle: async () => ({
                data: {
                  id: 1,
                  title: payload.title,
                  image_url: null,
                  ...payload,
                  created_at: "2026-07-23T00:00:00.000Z",
                },
                error: null,
              }),
            }),
          }),
        };
      },
      delete: () => ({
        eq: () => ({
          select: () => ({
            maybeSingle: async () => ({
              data: { id: 1, image_url: null },
              error: null,
            }),
          }),
        }),
      }),
    }),
    storage: {
      from: () => ({
        upload: (...arguments_: unknown[]) => database.upload(...arguments_),
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://storage.example/${path}` },
        }),
        remove: (...arguments_: unknown[]) => database.remove(...arguments_),
      }),
    },
  }),
}));

vi.mock("./metadata", () => ({
  extractPageMetadata: vi.fn().mockResolvedValue({
    url: "https://youtu.be/example",
    title: "테스트 영상",
    description: null,
    ogTitle: null,
    ogDescription: null,
    ogSiteName: "YouTube",
    ogType: "video",
  }),
}));

let app: Express;

beforeAll(async () => {
  process.env.SUPABASE_URL = "https://project.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.SUPABASE_STORAGE_BUCKET = "later-images";
  process.env.GEMINI_API_KEY = "";
  process.env.GEMINI_MODEL = "";
  ({ app } = await import("./index"));
});

beforeEach(() => {
  database.inserted = null;
  database.updated = null;
  database.selectedArchived = null;
  database.upload.mockClear();
  database.upload.mockResolvedValue({ error: null });
  database.remove.mockClear();
  database.remove.mockResolvedValue({ error: null });
});

describe("items API", () => {
  it("로컬 및 Vercel API 경로에서 health 상태를 반환한다", async () => {
    const localHealth = await request(app).get("/health");
    const vercelHealth = await request(app).get("/api/health");

    expect(localHealth.status).toBe(200);
    expect(localHealth.body).toEqual({ status: "ok" });
    expect(vercelHealth.status).toBe(200);
    expect(vercelHealth.body).toEqual({ status: "ok" });
  });

  it("이미지 없는 기존 URL JSON 요청을 저장한다", async () => {
    const response = await request(app)
      .post("/api/items")
      .send({ content: "https://youtu.be/example" });

    expect(response.status).toBe(201);
    expect(database.inserted).toMatchObject({
      type: "link",
      original_url: "https://youtu.be/example",
      image_url: null,
      category_main: "영상",
      category_sub: "유튜브",
      summary: "테스트 영상의 핵심 내용을 다루는 원문입니다.",
    });
  });

  it("이미지 없는 일반 텍스트 JSON 요청을 저장한다", async () => {
    const response = await request(app)
      .post("/api/items")
      .send({ content: "React 개발 문서" });

    expect(response.status).toBe(201);
    expect(database.inserted).toMatchObject({
      type: "text",
      title: "React 개발 문서",
      content: "React 개발 문서",
      image_url: null,
      category_main: "공부",
      category_sub: "프로그래밍",
      summary: "React 개발 문서",
    });
  });

  it("이미지 단독 multipart 요청을 업로드하고 미분류로 저장한다", async () => {
    const response = await request(app)
      .post("/api/items")
      .attach("image", Buffer.from("jpeg-image"), {
        filename: "photo.jpg",
        contentType: "image/jpeg",
      });

    expect(response.status).toBe(201);
    expect(database.upload).toHaveBeenCalledOnce();
    expect(database.inserted).toMatchObject({
      type: "image",
      title: "저장한 이미지",
      content: null,
      source_platform: "manual",
      category_main: "미분류",
      category_sub: null,
      summary: "저장한 이미지로 분류된 이미지입니다.",
    });
    expect(database.inserted?.image_url).toMatch(/^https:\/\/storage\.example\//);
  });

  it("Storage 이미지 업로드 실패 시 DB 저장을 중단한다", async () => {
    database.upload.mockResolvedValueOnce({
      error: new Error("Storage unavailable"),
    });

    const response = await request(app)
      .post("/api/items")
      .attach("image", Buffer.from("jpeg-image"), {
        filename: "photo.jpg",
        contentType: "image/jpeg",
      });

    expect(response.status).toBe(500);
    expect(response.body.error).toContain("Supabase Storage");
    expect(database.inserted).toBeNull();
  });

  it("활성 목록과 아카이브 목록을 구분해 조회한다", async () => {
    const active = await request(app).get("/api/items");
    expect(active.status).toBe(200);
    expect(database.selectedArchived).toBe(false);

    const archived = await request(app).get("/api/items?archived=true");
    expect(archived.status).toBe(200);
    expect(database.selectedArchived).toBe(true);

    const invalid = await request(app).get("/api/items?archived=yes");
    expect(invalid.status).toBe(400);
  });

  it("항목을 아카이브하고 복원한다", async () => {
    const archived = await request(app)
      .patch("/api/items/1/archive")
      .send({ archived: true });
    expect(archived.status).toBe(200);
    expect(database.updated).toMatchObject({
      is_archived: true,
    });
    expect(database.updated?.archived_at).toEqual(expect.any(String));

    const restored = await request(app)
      .patch("/api/items/1/archive")
      .send({ archived: false });
    expect(restored.status).toBe(200);
    expect(database.updated).toEqual({
      is_archived: false,
      archived_at: null,
    });
  });

  it("기존 수정, 삭제 API가 계속 응답한다", async () => {

    const updated = await request(app)
      .patch("/api/items/1")
      .send({ title: "수정된 제목" });
    expect(updated.status).toBe(200);
    expect(database.updated).toEqual({ title: "수정된 제목" });

    const deleted = await request(app).delete("/api/items/1");
    expect(deleted.status).toBe(200);
    expect(deleted.body).toEqual({ success: true, id: 1 });
  });
});
