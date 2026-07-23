import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../app.js";
import {
  GeminiMicrotaskError,
  generateGeminiMicrotask,
} from "../lib/geminiMicrotask.js";

vi.mock("../lib/geminiMicrotask.js", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../lib/geminiMicrotask.js")>();
  return {
    ...original,
    generateGeminiMicrotask: vi.fn(),
  };
});

const VALID_BODY = {
  title: "보고서 작성",
  type: "리포트/글쓰기",
  reason: "overwhelm",
  customReason: null,
  level: 2,
};

describe("POST /api/microtasks/lv2", () => {
  beforeEach(() => {
    vi.mocked(generateGeminiMicrotask).mockReset();
    vi.mocked(generateGeminiMicrotask).mockResolvedValue(
      "문서 파일을 열고 제목을 입력하기",
    );
  });

  it("유효한 Lv.2 요청에 Gemini microTask를 반환한다", async () => {
    const res = await request(app)
      .post("/api/microtasks/lv2")
      .send(VALID_BODY);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: {
        microTask: "문서 파일을 열고 제목을 입력하기",
        source: "gemini",
      },
    });
    expect(generateGeminiMicrotask).toHaveBeenCalledWith({
      title: "보고서 작성",
      type: "리포트/글쓰기",
      reason: "overwhelm",
      customReason: null,
    });
  });

  it.each([1, 3, 4, "2", null])("level=%s를 거부한다", async (level) => {
    const res = await request(app)
      .post("/api/microtasks/lv2")
      .send({ ...VALID_BODY, level });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("invalid_level");
  });

  it("화면 표시 문구를 reason으로 받지 않는다", async () => {
    const res = await request(app)
      .post("/api/microtasks/lv2")
      .send({ ...VALID_BODY, reason: "막막해서 못 시작" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("invalid_reason");
  });

  it.each([
    [{ ...VALID_BODY, title: "   " }, "invalid_title"],
    [{ ...VALID_BODY, title: "가".repeat(101) }, "invalid_title"],
    [{ ...VALID_BODY, type: "없는 유형" }, "invalid_type"],
  ])("잘못된 기본 입력을 거부한다", async (body, code) => {
    const res = await request(app).post("/api/microtasks/lv2").send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(code);
  });

  it("custom reason은 정규화한 customReason을 별도 전달한다", async () => {
    const res = await request(app)
      .post("/api/microtasks/lv2")
      .send({
        ...VALID_BODY,
        reason: "custom",
        customReason: " 어디서   시작할지 모르겠어요 ",
      });
    expect(res.status).toBe(200);
    expect(generateGeminiMicrotask).toHaveBeenCalledWith({
      title: "보고서 작성",
      type: "리포트/글쓰기",
      reason: "custom",
      customReason: "어디서 시작할지 모르겠어요",
    });
  });

  it.each([
    [{ ...VALID_BODY, reason: "custom", customReason: "" }],
    [{ ...VALID_BODY, reason: "custom", customReason: "가".repeat(201) }],
    [{ ...VALID_BODY, customReason: "섞으면 안 됨" }],
  ])("잘못된 customReason을 거부한다", async (body) => {
    const res = await request(app).post("/api/microtasks/lv2").send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("invalid_custom_reason");
  });

  it.each([
    ["provider_unavailable", 503],
    ["provider_timeout", 504],
    ["invalid_provider_response", 502],
  ] as const)("provider 오류 %s를 정해진 상태로 반환한다", async (code, status) => {
    vi.mocked(generateGeminiMicrotask).mockRejectedValue(
      new GeminiMicrotaskError(
        code,
        code === "provider_timeout"
          ? "timeout"
          : code === "invalid_provider_response"
            ? "invalid_response"
            : "network_error",
      ),
    );

    const res = await request(app)
      .post("/api/microtasks/lv2")
      .send(VALID_BODY);
    expect(res.status).toBe(status);
    expect(res.body.error.code).toBe(code);
  });
});
