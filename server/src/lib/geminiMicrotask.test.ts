import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_GEMINI_MODEL,
  GEMINI_TIMEOUT_MS,
  GeminiMicrotaskError,
  LV3_PROMPT_VERSION,
  PROMPT_VERSION,
  createGeminiMicrotaskCacheKey,
  generateGeminiMicrotask,
  generateGeminiLv3Microtask,
  isValidLv3MicrotaskQuality,
  resetGeminiMicrotaskCacheForTests,
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
  sourceDoneEventId: "done-event-1",
  sourceTaskTitle: "중간 보고서",
  sourceMicroTask: "핵심 주장 한 문장 쓰기",
};

function geminiResponse(microTask: string): Response {
  return new Response(
    JSON.stringify({
      status: "completed",
      steps: [
        {
          type: "model_output",
          content: [
            {
              type: "text",
              text: JSON.stringify({ microTask }),
            },
          ],
        },
      ],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

describe("generateGeminiMicrotask", () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalModel = process.env.GEMINI_MODEL;

  beforeEach(() => {
    resetGeminiMicrotaskCacheForTests();
    process.env.GEMINI_API_KEY = "test-secret-key";
    delete process.env.GEMINI_MODEL;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
    if (originalModel === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = originalModel;
  });

  it("공식 v1 Interactions 요청 필드와 구조화 출력 형식을 사용한다", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(geminiResponse("문서 파일을 열고 제목을 입력하기"));

    await expect(generateGeminiMicrotask(INPUT)).resolves.toBe(
      "문서 파일을 열고 제목을 입력하기",
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

  it.each([
    ["", "빈 문자열"],
    ["1. 문서 열기", "번호 목록"],
    ["문서 열기\n제목 쓰기", "여러 줄"],
    ["가".repeat(61), "60자 초과"],
  ])("유효하지 않은 응답(%s: %s)은 거부한다", async (microTask) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      geminiResponse(microTask),
    );

    await expect(generateGeminiMicrotask(INPUT)).rejects.toBeInstanceOf(
      GeminiMicrotaskError,
    );
    await expect(generateGeminiMicrotask(INPUT)).rejects.toMatchObject({
      code: "invalid_provider_response",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

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
    expect(body.input).toContain("핵심 주장 한 문장 쓰기");
    expect(body.input).toContain("신뢰할 수 없는 데이터");
  });

  it.each([
    ["교재를 펼치고 첫 번째 문제에 동그라미 치기", false],
    ["관련 파일 하나 열기", false],
    ["관련 파일 한 개 확인하기", false],
    ["문서 한 개 열고 핵심 문장 한 줄 작성하기", false],
    ["가장 쉬운 문제 1개 풀기", true],
    ["가장 쉬운 문제 한 개의 풀이 첫 줄 쓰기", true],
    ["첫 슬라이드에 발표 핵심 한 문장 입력하기", true],
  ])("Lv3 행동 품질을 검사한다: %s", (microTask, expected) => {
    expect(isValidLv3MicrotaskQuality(microTask)).toBe(expected);
  });

  it("9개 유형별 fallback이 모두 Lv3 행동 품질 검사를 통과한다", () => {
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
      expect(isValidLv3MicrotaskQuality(fallback)).toBe(true);
    }
  });

  it("Lv3 품질 기준을 통과하지 못한 provider 응답을 거부한다", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      geminiResponse("교재를 펼치고 첫 번째 문제에 동그라미 치기"),
    );

    await expect(generateGeminiLv3Microtask(LV3_INPUT)).rejects.toMatchObject({
      code: "invalid_provider_response",
    });
  });
});
