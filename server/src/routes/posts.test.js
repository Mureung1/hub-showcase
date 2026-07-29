import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import request from "supertest";
import { generateJson } from "../services/llmClient.js";
import { createApp } from "../app.js";
import { supabase } from "../db/index.js";

// 실제 Supabase 프로젝트에 그대로 연결해서 검증한다(mock 없음). 각 테스트가
// 만든 행은 afterEach에서 직접 지워서 테스트 간 독립성을 지킨다 — DELETE 테스트
// 자체에서 이미 지운 행은 afterEach가 다시 지우려 해도 조용히 무시된다.
// LLM 호출(generateJson)은 이 테스트의 관심사(저장/조회 흐름)가 아니고
// 비결정적이라 mock 처리한다.
vi.mock("../services/llmClient.js", () => ({ generateJson: vi.fn() }));

const app = createApp();
const createdIds = [];

beforeEach(() => {
  generateJson.mockReset();
});

afterEach(async () => {
  while (createdIds.length > 0) {
    const id = createdIds.pop();
    await supabase.from("posts").delete().eq("id", id);
  }
});

describe("POST /api/posts/notice", () => {
  it("정상 답변을 보내면 201과 생성된 Post를 반환한다", async () => {
    // Arrange
    const payload = { type: "sold-out", content: "인기 메뉴가 품절되었습니다." };
    generateJson.mockResolvedValue({ title: "품절 안내", content: payload.content });

    // Act
    const res = await request(app).post("/api/posts/notice").send(payload);
    createdIds.push(res.body.id);

    // Assert
    expect(res.status).toBe(201);
    expect(res.body.title).toBe("품절 안내");
    expect(res.body.content).toBe(payload.content);
  });

  it("생성한 Post는 실제로 Supabase에 저장되어 다시 조회된다", async () => {
    // Arrange
    const payload = { type: "hours-change", content: "영업시간이 변경됩니다." };
    generateJson.mockResolvedValue({ title: "영업시간 변경 안내", content: payload.content });

    // Act
    const created = await request(app).post("/api/posts/notice").send(payload);
    createdIds.push(created.body.id);
    const fetched = await request(app).get(`/api/posts/${created.body.id}`);

    // Assert
    expect(fetched.status).toBe(200);
    expect(fetched.body.title).toBe("영업시간 변경 안내");
  });

  it("content가 없으면 400과 MISSING_FIELDS 에러를 반환한다", async () => {
    // Arrange
    const payload = { type: "day-off" };

    // Act
    const res = await request(app).post("/api/posts/notice").send(payload);

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("MISSING_FIELDS");
  });
});

describe("GET /api/posts/:id", () => {
  it("존재하지 않는 id를 조회하면 404와 POST_NOT_FOUND 에러를 반환한다", async () => {
    // Arrange & Act
    const res = await request(app).get("/api/posts/not-a-real-id");

    // Assert
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("POST_NOT_FOUND");
  });
});

describe("DELETE /api/posts/:id", () => {
  it("존재하는 게시글을 삭제하면 204를 반환하고 실제로 Supabase에서 지워진다", async () => {
    // Arrange
    const payload = { type: "sold-out", content: "인기 메뉴가 품절되었습니다." };
    generateJson.mockResolvedValue({ title: "품절 안내", content: payload.content });
    const created = await request(app).post("/api/posts/notice").send(payload);

    // Act
    const res = await request(app).delete(`/api/posts/${created.body.id}`);
    const fetched = await request(app).get(`/api/posts/${created.body.id}`);

    // Assert
    expect(res.status).toBe(204);
    expect(fetched.status).toBe(404);
  });

  it("존재하지 않는 id를 삭제하려 하면 404와 POST_NOT_FOUND 에러를 반환한다", async () => {
    // Arrange & Act
    const res = await request(app).delete("/api/posts/not-a-real-id");

    // Assert
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("POST_NOT_FOUND");
  });
});
