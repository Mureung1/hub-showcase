import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ALLOWED_RESULT_VERBS,
  DEFAULT_GEMINI_MODEL,
  GEMINI_TIMEOUT_MS,
  LV3_PROMPT_VERSION,
  PROMPT_VERSION,
  createGeminiMicrotaskCacheKey,
  generateGeminiMicrotask,
  generateGeminiLv3Microtask,
  isValidMicrotaskQuality,
  resetGeminiMicrotaskCacheForTests,
  validateMicrotaskQuality,
  type GeminiLv3MicrotaskInput,
  type GeminiMicrotaskInput,
} from "./geminiMicrotask.js";

const INPUT: GeminiMicrotaskInput = {
  title: "  보고서   작성  ",
  type: "리포트/글쓰기",
  reason: "overwhelm",
  customReason: null,
};

const LV3_INPUT: GeminiLv3MicrotaskInput = {
  ...INPUT,
  reasonChanged: false,
  lv2MicroTask: "발표 자료에 제목과 목차 3개 적기",
  sourceDoneEventId: "done-event-1",
  sourceTaskTitle: "중간 보고서",
  sourceMicroTask: "핵심 주장 한 문장 쓰기",
};

function geminiTextResponse(text: string): Response {
  return new Response(
    JSON.stringify({
      status: "completed",
      steps: [
        {
          type: "model_output",
          content: [
            {
              type: "text",
              text,
            },
          ],
        },
      ],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

function geminiResponse(microTask: string): Response {
  return geminiTextResponse(JSON.stringify({ microTask }));
}

describe("generateGeminiMicrotask", () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalModel = process.env.GEMINI_MODEL;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalDebugValidation = process.env.GEMINI_DEBUG_VALIDATION;

  beforeEach(() => {
    resetGeminiMicrotaskCacheForTests();
    process.env.GEMINI_API_KEY = "test-secret-key";
    delete process.env.GEMINI_MODEL;
    process.env.NODE_ENV = "test";
    delete process.env.GEMINI_DEBUG_VALIDATION;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
    if (originalModel === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = originalModel;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalDebugValidation === undefined) {
      delete process.env.GEMINI_DEBUG_VALIDATION;
    } else {
      process.env.GEMINI_DEBUG_VALIDATION = originalDebugValidation;
    }
  });

  it("공식 v1 Interactions 요청 필드와 구조화 출력 형식을 사용한다", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(geminiResponse("문서 파일에 제목 한 줄 입력하기"));

    await expect(generateGeminiMicrotask(INPUT)).resolves.toBe(
      "문서 파일에 제목 한 줄 입력하기",
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://generativelanguage.googleapis.com/v1/interactions",
    );
    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe(DEFAULT_GEMINI_MODEL);
    expect(body.store).toBe(false);
    expect(body.generation_config).toEqual({ max_output_tokens: 64 });
    expect(body.response_format).toMatchObject({
      type: "text",
      mime_type: "application/json",
      schema: {
        type: "object",
        required: ["microTask"],
      },
    });
    expect(body.input).toContain(`promptVersion=${PROMPT_VERSION}`);
    expect(init?.headers).toEqual({
      "Content-Type": "application/json",
      "x-goog-api-key": "test-secret-key",
    });
  });

  it("Lv2 프롬프트에도 허용 동사·금지 동사·준비/결과 분리 지시가 들어간다", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(geminiResponse("제목 한 줄 입력하기"));

    await generateGeminiMicrotask(INPUT);

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.input).toContain("열기, 읽기, 보기, 확인하기");
    expect(body.input).toContain(
      "준비 동작과 결과 동작을 한 문장에 섞지 말고",
    );
    expect(body.input).toContain("행동 문장은 반드시 다음 동사 중 하나로 끝나야 합니다");
    for (const verb of ALLOWED_RESULT_VERBS) {
      expect(body.input).toContain(verb);
    }
    expect(body.input).toContain("피하기: 표를 채우기");
    expect(body.input).toContain("권장: 표의 첫 행에 값 하나 입력하기");
    // INPUT은 리포트/글쓰기 × overwhelm이므로 그 조합의 동적 예시가 들어간다.
    expect(body.input).toContain(
      "이번 요청과 같은 유형·회피 이유에 어울리는 좋은 예: 빈 문서를 연 채로 제목 한 줄 입력하기",
    );
  });

  it.each([
    ["리포트/글쓰기", "overwhelm", "빈 문서를 연 채로 제목 한 줄 입력하기"],
    ["리포트/글쓰기", "dislike", "문서를 연 채로 첫 문장 한 줄 쓰기"],
    ["문제풀이/암기", "overwhelm", "첫 문제 조건을 노트에 한 줄 옮겨 적기"],
    ["발표/PT 준비", "temptation", "폰을 멀리 둔 채로 PPT 첫 장 제목 한 줄 입력하기"],
    ["코딩 실습", "overwhelm", "요구사항에서 할 일 한 줄 적기"],
    ["기타", "dislike", "해야 할 일 첫 단계 한 줄 적기"],
  ] as const)(
    "유형=%s 이유=%s일 때 해당 조합의 동적 예시가 프롬프트에 들어간다",
    async (type, reason, expectedExample) => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(geminiResponse("제목 한 줄 입력하기"));

      await generateGeminiMicrotask({ ...INPUT, type, reason });

      const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
      expect(body.input).toContain(
        `이번 요청과 같은 유형·회피 이유에 어울리는 좋은 예: ${expectedExample}`,
      );
    },
  );

  it.each([
    ["리포트/글쓰기", "완벽하지 않은 리포트 제목 초안 한 줄 적기"],
    ["문제풀이/암기", "정답 확신 없어도 첫 문제 풀이 초안 한 줄 쓰기"],
    ["발표/PT 준비", "다듬지 않은 발표 제목 초안 한 줄 작성하기"],
    ["코딩 실습", "완벽하지 않은 임시 코드 한 줄 작성하기"],
    ["시험공부", "완벽하지 않게 핵심 개념 한 줄 요약하기"],
    ["프로젝트", "다듬지 않은 초안 메모 한 줄 작성하기"],
    ["조별과제", "완벽하지 않은 내 파트 초안 한 줄 쓰기"],
    ["개인공부", "정리되지 않아도 되는 핵심 내용 한 줄 적기"],
    ["기타", "완벽하지 않은 임시 메모 한 줄 적기"],
  ] as const)(
    "reason=custom이면 유형=%s에 맞는 custom 예시가 들어간다",
    async (type, expectedExample) => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(geminiResponse("제목 한 줄 입력하기"));

      await generateGeminiMicrotask({
        ...INPUT,
        type,
        reason: "custom",
        customReason: "완벽하게 하고 싶어서",
      });

      const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
      expect(body.input).toContain(
        `이번 요청과 같은 유형·회피 이유에 어울리는 좋은 예: ${expectedExample}`,
      );
    },
  );

  it("reason=custom이고 유형이 매핑에 없으면 범용 custom 예시로 폴백한다", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(geminiResponse("제목 한 줄 입력하기"));

    await generateGeminiMicrotask({
      ...INPUT,
      type: "존재하지 않는 유형",
      reason: "custom",
      customReason: "완벽하게 하고 싶어서",
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.input).toContain(
      "이번 요청과 같은 유형·회피 이유에 어울리는 좋은 예: 해야 할 일을 한 문장으로 적기",
    );
  });

  it("동적 예시 매핑에 없는 유형+비-custom 이유에는 해당 안내 줄 자체가 빠진다", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(geminiResponse("제목 한 줄 입력하기"));

    await generateGeminiMicrotask({ ...INPUT, type: "존재하지 않는 유형" });

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.input).not.toContain("이번 요청과 같은 유형·회피 이유에 어울리는 좋은 예:");
  });

  it.each([
    ["교재를 펼치고 첫 문제의 조건 읽기", "quality_chained_action"],
    ["첫 슬라이드의 핵심 문장 선택", "quality_result_verb_missing"],
    ["발표 핵심을 작성하기", "quality_bounded_scope_missing"],
  ] as const)(
    "Lv2도 품질 기준을 통과하지 못한 응답을 %s로 거부한다",
    async (microTask, rule) => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        geminiResponse(microTask),
      );

      await expect(generateGeminiMicrotask(INPUT)).rejects.toMatchObject({
        code: "invalid_provider_response",
        validationStage: "quality",
        validationRule: rule,
        parsed: true,
      });
    },
  );

  it("동일한 동시 요청은 in-flight Promise와 Gemini 호출을 공유한다", async () => {
    let resolveFetch!: (value: Response) => void;
    const pending = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockReturnValue(pending);

    const first = generateGeminiMicrotask(INPUT);
    const second = generateGeminiMicrotask(INPUT);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch(geminiResponse("제목 한 줄 입력하기"));
    await expect(Promise.all([first, second])).resolves.toEqual([
      "제목 한 줄 입력하기",
      "제목 한 줄 입력하기",
    ]);
  });

  it("성공 결과는 TTL 캐시에서 재사용한다", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(geminiResponse("제목 한 줄 입력하기"));

    await generateGeminiMicrotask(INPUT);
    await generateGeminiMicrotask(INPUT);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("성공 캐시 TTL이 지나면 Gemini를 다시 호출한다", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-24T00:00:00.000Z"));
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () =>
        geminiResponse("제목 한 줄 입력하기"),
      );

    await generateGeminiMicrotask(INPUT);
    await vi.advanceTimersByTimeAsync(10 * 60 * 1_000 + 1);
    await generateGeminiMicrotask(INPUT);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("실제 model이나 promptVersion이 다르면 캐시 key가 달라진다", () => {
    const base = createGeminiMicrotaskCacheKey(
      INPUT,
      "gemini-3.5-flash-lite",
      "lv2-v1",
    );
    expect(
      createGeminiMicrotaskCacheKey(
        INPUT,
        "gemini-3.6-flash",
        "lv2-v1",
      ),
    ).not.toBe(base);
    expect(
      createGeminiMicrotaskCacheKey(
        INPUT,
        "gemini-3.5-flash-lite",
        "lv2-v2",
      ),
    ).not.toBe(base);
  });

  it("title과 customReason의 연속 공백을 정규화해 같은 key로 만든다", () => {
    const first = createGeminiMicrotaskCacheKey(
      {
        title: "  보고서   작성 ",
        type: "리포트/글쓰기",
        reason: "custom",
        customReason: " 어디서   시작할지 모르겠음 ",
      },
      DEFAULT_GEMINI_MODEL,
    );
    const second = createGeminiMicrotaskCacheKey(
      {
        title: "보고서 작성",
        type: "리포트/글쓰기",
        reason: "custom",
        customReason: "어디서 시작할지 모르겠음",
      },
      DEFAULT_GEMINI_MODEL,
    );
    expect(first).toBe(second);
  });

  it("API key 누락은 configuration_missing 로그와 provider_unavailable로 구분한다", async () => {
    delete process.env.GEMINI_API_KEY;
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi.spyOn(globalThis, "fetch");

    await expect(generateGeminiMicrotask(INPUT)).rejects.toMatchObject({
      code: "provider_unavailable",
      category: "configuration_missing",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('"category":"configuration_missing"'),
    );
  });

  it("2초가 지나면 provider_timeout으로 중단한다", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );

    const result = generateGeminiMicrotask(INPUT);
    const rejection = expect(result).rejects.toMatchObject({
      code: "provider_timeout",
      category: "timeout",
    });
    await vi.advanceTimersByTimeAsync(GEMINI_TIMEOUT_MS);

    await rejection;
  });

  it.each([
    [429, "rate_limited"],
    [500, "provider_error"],
  ] as const)("provider HTTP %s를 %s category로 구분한다", async (status, category) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("provider raw body", { status }),
    );

    await expect(generateGeminiMicrotask(INPUT)).rejects.toMatchObject({
      code: "provider_unavailable",
      category,
      providerStatus: status,
    });
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining(`"category":"${category}"`),
    );
  });

  it("HTTP 응답 body가 JSON이 아니면 원인과 안전한 진단값을 기록한다", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("not-json", { status: 200 }),
    );

    await expect(generateGeminiMicrotask(INPUT)).rejects.toMatchObject({
      code: "invalid_provider_response",
      validationStage: "response_body",
      validationRule: "response_body_not_json",
      parsed: false,
      responseLength: 8,
    });
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('"rule":"response_body_not_json"'),
    );
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('"parsed":false'),
    );
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('"responseLength":8'),
    );
  });

  it.each([
    [null, "payload_not_object"],
    [{}, "steps_not_array"],
    [{ steps: [] }, "model_text_missing"],
  ] as const)("provider 구조 실패를 %s 규칙으로 구분한다", async (payload, rule) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200 }),
    );

    await expect(generateGeminiMicrotask(INPUT)).rejects.toMatchObject({
      code: "invalid_provider_response",
      validationStage: "model_text_extraction",
      validationRule: rule,
      parsed: false,
    });
  });

  it.each([
    ["plain text", "model_text_not_json", false],
    ['"plain text"', "structured_output_not_object", true],
    ["{}", "microtask_not_string", true],
  ] as const)(
    "구조화 출력 실패를 %s 규칙으로 구분한다",
    async (modelText, rule, parsed) => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        geminiTextResponse(modelText),
      );

      await expect(generateGeminiMicrotask(INPUT)).rejects.toMatchObject({
        code: "invalid_provider_response",
        validationStage: "structured_output",
        validationRule: rule,
        parsed,
      });
    },
  );

  it.each([
    ["", "microtask_empty"],
    ["문서 한 줄\n작성하기", "microtask_multiline"],
    ["가".repeat(61), "microtask_too_long"],
    ["1. 문서에 제목 한 줄 쓰기", "microtask_list_prefix"],
  ] as const)(
    "공통 형식 실패를 %s 규칙으로 구분한다",
    async (microTask, rule) => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        geminiResponse(microTask),
      );

      await expect(generateGeminiMicrotask(INPUT)).rejects.toMatchObject({
        code: "invalid_provider_response",
        validationStage: "microtask_format",
        validationRule: rule,
        parsed: true,
      });
    },
  );

  it("민감한 입력과 Gemini 원문 응답을 실패 로그에 남기지 않는다", async () => {
    const sensitiveInput: GeminiMicrotaskInput = {
      title: "비밀 과제 제목",
      type: "기타",
      reason: "custom",
      customReason: "상담 내용이 들어간 비밀 이유",
    };
    const rawProviderText = "외부 원문 비밀";
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(rawProviderText, { status: 500 }),
    );

    await expect(generateGeminiMicrotask(sensitiveInput)).rejects.toMatchObject({
      code: "provider_unavailable",
    });

    const serializedLogs = JSON.stringify(log.mock.calls);
    expect(serializedLogs).not.toContain("test-secret-key");
    expect(serializedLogs).not.toContain(sensitiveInput.title);
    expect(serializedLogs).not.toContain(sensitiveInput.customReason);
    expect(serializedLogs).not.toContain(rawProviderText);
  });

  it("명시적 개발 플래그에서만 파싱된 microTask preview를 제한·마스킹한다", async () => {
    process.env.NODE_ENV = "development";
    process.env.GEMINI_DEBUG_VALIDATION = "1";
    const debugInput: GeminiLv3MicrotaskInput = {
      title: "PRIVATE_TITLE",
      type: "리포트/글쓰기",
      reason: "custom",
      customReason: "PRIVATE_REASON",
      reasonChanged: true,
      lv2MicroTask: "PRIVATE_LV2_ACTION",
      sourceDoneEventId: "PRIVATE_EVENT_ID",
      sourceTaskTitle: "PRIVATE_SOURCE_TITLE",
      sourceMicroTask: "PRIVATE_SOURCE_ACTION",
    };
    const generated =
      "PRIVATE_TITLE PRIVATE_REASON PRIVATE_EVENT_ID PRIVATE_SOURCE_TITLE PRIVATE_SOURCE_ACTION 그리고 첫 문장 쓰기";
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(geminiResponse(generated));

    await expect(generateGeminiLv3Microtask(debugInput)).rejects.toMatchObject({
      code: "invalid_provider_response",
    });

    const serializedLogs = JSON.stringify(log.mock.calls);
    expect(serializedLogs).toContain("microTaskPreview");
    expect(serializedLogs).toContain("[redacted]");
    expect(serializedLogs).not.toContain(debugInput.title);
    expect(serializedLogs).not.toContain(debugInput.customReason);
    expect(serializedLogs).not.toContain(debugInput.lv2MicroTask);
    expect(serializedLogs).not.toContain(debugInput.sourceDoneEventId);
    expect(serializedLogs).not.toContain(debugInput.sourceTaskTitle);
    expect(serializedLogs).not.toContain(debugInput.sourceMicroTask);
    expect(serializedLogs).not.toContain("test-secret-key");
  });

  it("Lv3는 현재 Task와 과거 microTask를 참고 데이터로 전달한다", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(geminiResponse("목차 후보를 세 줄로 작성하기"));

    await expect(generateGeminiLv3Microtask(LV3_INPUT)).resolves.toBe(
      "목차 후보를 세 줄로 작성하기",
    );

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.input).toContain(`promptVersion=${LV3_PROMPT_VERSION}`);
    expect(body.input).toContain("보고서 작성");
    expect(body.input).toContain("리포트/글쓰기");
    expect(body.input).toContain("발표 자료에 제목과 목차 3개 적기");
    expect(body.input).toContain('"reasonChanged":false');
    expect(body.input).toContain("핵심 주장 한 문장 쓰기");
    expect(body.input).toContain("신뢰할 수 없는 데이터");
    expect(body.input).toContain("준비 동작을 함께 쓰지 말고");
    expect(body.input).toContain("피하기: 문서를 열고");
    expect(body.input).toContain("권장: 문서에 핵심 주장");
    expect(body.input).toContain("반드시 다음 동사 중 하나로 끝나야 합니다");
    expect(body.input).toContain("쓰기, 써보기, 적기");
    expect(body.input).toContain("피하기: 표를 채우기");
    expect(body.input).toContain("권장: 표의 첫 행에 값 하나 입력하기");
    // reason=overwhelm 전략이 프롬프트에 실제로 들어간다.
    expect(body.input).toContain("회피 이유가 막막함이므로");
  });

  it.each([
    ["overwhelm", null, "회피 이유가 막막함이므로"],
    ["dislike", null, "회피 이유가 하기 싫음이므로"],
    ["temptation", null, "회피 이유가 눈앞의 유혹이므로"],
    ["custom", "완벽하게 하고 싶어서", "회피 이유가 사용자가 직접 입력한 경우이므로"],
  ])(
    "Lv3 프롬프트에 reason=%s 전략 문구가 정확히 들어간다",
    async (reason, customReason, expectedStrategy) => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(geminiResponse("목차 첫 항목 한 줄 쓰기"));

      await generateGeminiLv3Microtask({
        ...LV3_INPUT,
        reason: reason as GeminiLv3MicrotaskInput["reason"],
        customReason,
      });

      const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
      expect(body.input).toContain(expectedStrategy);
    },
  );

  it("temptation 전략은 방해 제거 준비 동작을 문장에 넣지 말라고 명시한다 (검증 충돌 방지)", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(geminiResponse("첫 문장 한 줄 쓰기"));

    await generateGeminiLv3Microtask({ ...LV3_INPUT, reason: "temptation" });

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.input).toContain("방해 요소를 치우라는 준비 동작은 문장에 넣지 말고");
  });

  it.each([
    ["교재를 펼치고 첫 번째 문제에 동그라미 치기", false],
    ["관련 파일 하나 열기", false],
    ["관련 파일 한 개 확인하기", false],
    ["문서 한 개 열고 핵심 문장 한 줄 작성하기", false],
    ["가장 쉬운 문제 1개 풀기", true],
    ["가장 쉬운 문제 한 개의 풀이 첫 줄 쓰기", true],
    ["첫 슬라이드에 발표 핵심 한 문장 입력하기", true],
  ])("Lv2/Lv3 공용 행동 품질을 검사한다: %s", (microTask, expected) => {
    expect(isValidMicrotaskQuality(microTask)).toBe(expected);
  });

  it.each([
    ["문서를 열고 핵심 주장 한 문장 쓰기", "quality_chained_action"],
    ["첫 슬라이드의 핵심 문장 선택", "quality_result_verb_missing"],
    ["발표 핵심을 작성하기", "quality_bounded_scope_missing"],
  ] as const)("품질 실패 규칙을 구분한다: %s", (microTask, rule) => {
    expect(validateMicrotaskQuality(microTask)).toEqual({
      valid: false,
      rule,
    });
  });

  it("9개 유형별 fallback이 모두 행동 품질 검사를 통과한다", () => {
    const fallbacks = [
      "문서에 핵심 주장 한 문장 쓰기",
      "가장 쉬운 문제 한 개의 풀이 첫 줄 쓰기",
      "첫 슬라이드에 발표 핵심 한 문장 입력하기",
      "작업 파일에 해결할 TODO 한 줄 작성하기",
      "첫 소제목 내용을 한 문장으로 요약하기",
      "다음 작업 하나를 체크리스트에 작성하기",
      "공유 문서의 내 담당 부분에 첫 문장 쓰기",
      "첫 소제목의 핵심을 한 문장으로 적기",
      "5분 안에 남길 결과 한 줄 작성하기",
    ];

    expect(fallbacks).toHaveLength(9);
    for (const fallback of fallbacks) {
      expect(isValidMicrotaskQuality(fallback)).toBe(true);
    }
  });

  it("Lv3 품질 기준을 통과하지 못한 provider 응답을 거부한다", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      geminiResponse("교재를 펼치고 첫 번째 문제에 동그라미 치기"),
    );

    await expect(generateGeminiLv3Microtask(LV3_INPUT)).rejects.toMatchObject({
      code: "invalid_provider_response",
      validationStage: "quality",
      validationRule: "quality_chained_action",
      parsed: true,
    });
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('"rule":"quality_chained_action"'),
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain("microTaskPreview");
  });
});
