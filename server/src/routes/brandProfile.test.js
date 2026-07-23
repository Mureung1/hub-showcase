import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { supabase } from "../db/index.js";

// 실제 Supabase 프로젝트에 그대로 연결해서 검증한다(mock 없음). 각 테스트가
// 만든 행은 afterEach에서 직접 지워서 테스트 간 독립성을 지킨다 — brand-profile
// API에 DELETE가 없어서 supabase 클라이언트로 직접 지운다.
const app = createApp();
const createdIds = [];

afterEach(async () => {
  while (createdIds.length > 0) {
    const id = createdIds.pop();
    await supabase.from("brand_profiles").delete().eq("id", id);
  }
});

function validAnswers(overrides = {}) {
  return {
    businessType: "디저트 카페",
    storeName: "OO카페",
    mainProduct: "티라미수, 아인슈페너",
    targetCustomer: "동네 주민",
    brandMood: "아늑하고 친근한",
    strength: "가성비 좋은 디저트",
    tone: "친근하고 다정한 말투",
    goal: "신규 고객 유입",
    ...overrides,
  };
}

describe("POST /api/brand-profile", () => {
  it("정상 답변을 보내면 201과 summary/keywords가 채워진 프로필을 반환한다", async () => {
    // Arrange
    const payload = validAnswers();

    // Act
    const res = await request(app).post("/api/brand-profile").send(payload);
    createdIds.push(res.body.id);

    // Assert
    expect(res.status).toBe(201);
    expect(res.body.summary).toBe("동네 주민이 자주 찾는 가성비 좋은 디저트 디저트 카페");
    expect(res.body.keywords).toEqual(["아늑하고 친근한", "가성비 좋은 디저트", "디저트 카페"]);
  });

  it("생성한 프로필은 실제로 Supabase에 저장되어 다시 조회된다", async () => {
    // Arrange
    const payload = validAnswers();

    // Act
    const created = await request(app).post("/api/brand-profile").send(payload);
    createdIds.push(created.body.id);
    const fetched = await request(app).get("/api/brand-profile");

    // Assert
    expect(fetched.status).toBe(200);
    expect(fetched.body.id).toBe(created.body.id);
    expect(fetched.body.storeName).toBe("OO카페");
  });

  it("필수 필드가 없으면 400과 MISSING_FIELDS 에러를 반환한다", async () => {
    // Arrange
    const payload = validAnswers({ storeName: undefined });

    // Act
    const res = await request(app).post("/api/brand-profile").send(payload);

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("MISSING_FIELDS");
  });
});

describe("GET /api/brand-profile", () => {
  it("프로필이 없으면 404와 BRAND_PROFILE_NOT_FOUND 에러를 반환한다", async () => {
    // Arrange & Act
    const res = await request(app).get("/api/brand-profile");

    // Assert
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("BRAND_PROFILE_NOT_FOUND");
  });

  it("프로필이 있으면 200과 해당 프로필을 반환한다", async () => {
    // Arrange
    const created = await request(app).post("/api/brand-profile").send(validAnswers());
    createdIds.push(created.body.id);

    // Act
    const res = await request(app).get("/api/brand-profile");

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.id);
  });
});

describe("PATCH /api/brand-profile", () => {
  it("프로필이 없으면 404와 BRAND_PROFILE_NOT_FOUND 에러를 반환한다", async () => {
    // Arrange
    const payload = { storeName: "새이름카페" };

    // Act
    const res = await request(app).patch("/api/brand-profile").send(payload);

    // Assert
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("BRAND_PROFILE_NOT_FOUND");
  });

  it("프로필이 있으면 200과 수정된 프로필을 반환하고 실제로 반영된다", async () => {
    // Arrange
    const created = await request(app).post("/api/brand-profile").send(validAnswers());
    createdIds.push(created.body.id);

    // Act
    const res = await request(app).patch("/api/brand-profile").send({ storeName: "새이름카페" });
    const fetched = await request(app).get("/api/brand-profile");

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.storeName).toBe("새이름카페");
    expect(fetched.body.storeName).toBe("새이름카페");
  });
});
