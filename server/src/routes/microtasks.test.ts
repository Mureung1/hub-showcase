import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../app.js";
import {
  GeminiMicrotaskError,
  generateGeminiMicrotask,
  generateGeminiLv3Microtask,
  getServerLv2FallbackMicroTask,
  getServerLv3FallbackMicroTask,
} from "../lib/geminiMicrotask.js";
import { findLv3MemoryContext } from "../lib/lv3MemoryCandidate.js";

vi.mock("../lib/geminiMicrotask.js", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../lib/geminiMicrotask.js")>();
  return {
    ...original,
    generateGeminiMicrotask: vi.fn(),
    generateGeminiLv3Microtask: vi.fn(),
  };
});

vi.mock("../lib/lv3MemoryCandidate.js", () => ({
  findLv3MemoryContext: vi.fn(),
}));

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
    ["invalid_provider_response", "invalid_response"],
    ["provider_timeout", "timeout"],
    ["provider_unavailable", "network_error"],
    ["provider_unavailable", "provider_error"],
    ["provider_unavailable", "rate_limited"],
  ] as const)(
    "Gemini 실패(%s/%s)는 502/504로 실패하지 않고 규칙 기반 fallback을 200으로 돌려준다",
    async (code, category) => {
      vi.mocked(generateGeminiMicrotask).mockRejectedValue(
        new GeminiMicrotaskError(code, category),
      );

      const res = await request(app)
        .post("/api/microtasks/lv2")
        .send(VALID_BODY);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        data: {
          microTask: getServerLv2FallbackMicroTask("리포트/글쓰기", "overwhelm"),
          source: "rule_based",
        },
      });
    },
  );

  it("configuration_missing(설정 문제)은 fallback으로 가리지 않고 기존 503을 유지한다", async () => {
    vi.mocked(generateGeminiMicrotask).mockRejectedValue(
      new GeminiMicrotaskError("provider_unavailable", "configuration_missing"),
    );

    const res = await request(app)
      .post("/api/microtasks/lv2")
      .send(VALID_BODY);

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe("provider_unavailable");
  });
});

const VALID_LV3_BODY = {
  taskId: "current-task",
  reason: "overwhelm",
  customReason: null,
  reasonChanged: false,
  lv2MicroTask: "발표 자료에 제목과 목차 3개 적기",
  level: 3,
};

describe("POST /api/microtasks/lv3", () => {
  beforeEach(() => {
    vi.mocked(findLv3MemoryContext).mockReset();
    vi.mocked(generateGeminiLv3Microtask).mockReset();
    vi.mocked(findLv3MemoryContext).mockResolvedValue({
      currentTask: {
        id: "current-task",
        title: "기말 리포트",
        type: "리포트/글쓰기",
      },
      candidate: {
        sourceDoneEventId: "done-event-1",
        sourceTaskTitle: "중간 리포트",
        sourceMicroTask: "핵심 주장 한 문장 쓰기",
      },
    });
    vi.mocked(generateGeminiLv3Microtask).mockResolvedValue(
      "목차 후보를 세 줄로 작성하기",
    );
  });

  it("서버가 선택한 과거 done 근거로 Lv3 행동을 생성한다", async () => {
    const res = await request(app)
      .post("/api/microtasks/lv3")
      .send({
        ...VALID_LV3_BODY,
        memoryEvidence: { sourceDoneEventId: "client-forged" },
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: {
        status: "generated",
        microTask: "목차 후보를 세 줄로 작성하기",
        source: "gemini",
        memoryEvidence: { sourceDoneEventId: "done-event-1" },
      },
    });
    expect(findLv3MemoryContext).toHaveBeenCalledWith("current-task");
    expect(generateGeminiLv3Microtask).toHaveBeenCalledWith({
      title: "기말 리포트",
      type: "리포트/글쓰기",
      reason: "overwhelm",
      customReason: null,
      reasonChanged: false,
      lv2MicroTask: "발표 자료에 제목과 목차 3개 적기",
      sourceDoneEventId: "done-event-1",
      sourceTaskTitle: "중간 리포트",
      sourceMicroTask: "핵심 주장 한 문장 쓰기",
    });
  });

  it("적합한 과거 기록이 없어도 Lv2 행동과 최신 이유로 Gemini를 호출한다", async () => {
    vi.mocked(findLv3MemoryContext).mockResolvedValue({
      currentTask: {
        id: "current-task",
        title: "기말 리포트",
        type: "리포트/글쓰기",
      },
      candidate: null,
    });

    const res = await request(app)
      .post("/api/microtasks/lv3")
      .send(VALID_LV3_BODY);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: {
        status: "generated",
        microTask: "목차 후보를 세 줄로 작성하기",
        source: "gemini",
        memoryEvidence: null,
      },
    });
    expect(generateGeminiLv3Microtask).toHaveBeenCalledWith({
      title: "기말 리포트",
      type: "리포트/글쓰기",
      reason: "overwhelm",
      customReason: null,
      reasonChanged: false,
      lv2MicroTask: "발표 자료에 제목과 목차 3개 적기",
      sourceDoneEventId: null,
      sourceTaskTitle: null,
      sourceMicroTask: null,
    });
  });

  it("이유가 달라지면 최신 이유와 변경 여부를 Gemini 입력에 전달한다", async () => {
    await request(app)
      .post("/api/microtasks/lv3")
      .send({
        ...VALID_LV3_BODY,
        reason: "custom",
        customReason: "완벽하게 하고 싶음",
        reasonChanged: true,
      });

    expect(generateGeminiLv3Microtask).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: "custom",
        customReason: "완벽하게 하고 싶음",
        reasonChanged: true,
      }),
    );
  });

  it.each([
    [{ ...VALID_LV3_BODY, lv2MicroTask: "가".repeat(61) }, "invalid_lv2_microtask"],
    [{ ...VALID_LV3_BODY, reasonChanged: "yes" }, "invalid_reason_changed"],
  ])("잘못된 Lv3 비교 컨텍스트를 거부한다", async (body, code) => {
    const res = await request(app).post("/api/microtasks/lv3").send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(code);
    expect(generateGeminiLv3Microtask).not.toHaveBeenCalled();
  });

  it.each([
    ["invalid_provider_response", "invalid_response"],
    ["provider_timeout", "timeout"],
    ["provider_unavailable", "network_error"],
    ["provider_unavailable", "provider_error"],
    ["provider_unavailable", "rate_limited"],
  ] as const)(
    "Gemini 실패(%s/%s)는 502/504로 실패하지 않고 규칙 기반 fallback을 200으로 돌려준다",
    async (code, category) => {
      vi.mocked(generateGeminiLv3Microtask).mockRejectedValue(
        new GeminiMicrotaskError(code, category),
      );

      const res = await request(app)
        .post("/api/microtasks/lv3")
        .send(VALID_LV3_BODY);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        data: {
          status: "generated",
          microTask: getServerLv3FallbackMicroTask("리포트/글쓰기"),
          source: "rule_based",
          memoryEvidence: null,
        },
      });
    },
  );

  it("configuration_missing(설정 문제)은 fallback으로 가리지 않고 기존 503을 유지한다", async () => {
    vi.mocked(generateGeminiLv3Microtask).mockRejectedValue(
      new GeminiMicrotaskError("provider_unavailable", "configuration_missing"),
    );

    const res = await request(app)
      .post("/api/microtasks/lv3")
      .send(VALID_LV3_BODY);

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe("provider_unavailable");
  });

  it("할일 조회 자체가 실패하면(taskId 못 찾음) fallback을 시도하지 않는다", async () => {
    vi.mocked(findLv3MemoryContext).mockResolvedValue(null);

    const res = await request(app)
      .post("/api/microtasks/lv3")
      .send(VALID_LV3_BODY);

    expect(res.status).toBe(404);
    expect(generateGeminiLv3Microtask).not.toHaveBeenCalled();
  });

  it.each([2, 4, "3", null])("level=%s를 거부한다", async (level) => {
    const res = await request(app)
      .post("/api/microtasks/lv3")
      .send({ ...VALID_LV3_BODY, level });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("invalid_level");
  });
});
