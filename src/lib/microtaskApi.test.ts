import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "./api.js";
import {
  LV2_MICROTASK_CLIENT_TIMEOUT_MS,
  LV3_MICROTASK_CLIENT_TIMEOUT_MS,
  requestLv2Microtask,
  requestLv3Microtask,
  resetLv2MicrotaskRequestsForTests,
  resetLv3MicrotaskRequestsForTests,
  type Lv2MicrotaskRequest,
  type Lv3MicrotaskRequest,
} from "./microtaskApi.js";

vi.mock("./api.js", () => ({
  apiFetch: vi.fn(),
}));

const INPUT: Lv2MicrotaskRequest = {
  title: "보고서 작성",
  type: "리포트/글쓰기",
  reason: "overwhelm",
  customReason: null,
  level: 2,
};

const LV3_INPUT: Lv3MicrotaskRequest = {
  taskId: "current-task",
  reason: "overwhelm",
  customReason: null,
  reasonChanged: false,
  lv2MicroTask: "발표 자료에 제목과 목차 3개 적기",
  level: 3,
};

describe("requestLv2Microtask", () => {
  beforeEach(() => {
    resetLv2MicrotaskRequestsForTests();
    vi.mocked(apiFetch).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("동일한 진행 중 요청은 Promise와 HTTP 호출을 공유한다", async () => {
    let resolveRequest!: (value: unknown) => void;
    vi.mocked(apiFetch).mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );

    const first = requestLv2Microtask(INPUT);
    const second = requestLv2Microtask({ ...INPUT });
    expect(first).toBe(second);
    expect(apiFetch).toHaveBeenCalledTimes(1);

    resolveRequest({
      data: { microTask: "문서를 열고 제목을 입력하기", source: "gemini" },
    });
    await expect(Promise.all([first, second])).resolves.toEqual([
      {
        microTask: "문서를 열고 제목을 입력하기",
        generationSource: "gemini",
      },
      {
        microTask: "문서를 열고 제목을 입력하기",
        generationSource: "gemini",
      },
    ]);
  });

  it("성공 결과는 프런트에 캐시하지 않는다", async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      data: { microTask: "문서를 열기", source: "gemini" },
    });

    await requestLv2Microtask(INPUT);
    await requestLv2Microtask(INPUT);

    expect(apiFetch).toHaveBeenCalledTimes(2);
  });

  it("실패 후 in-flight 잠금을 해제해 다시 요청할 수 있다", async () => {
    vi.mocked(apiFetch)
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({
        data: { microTask: "문서를 열기", source: "gemini" },
      });

    await expect(requestLv2Microtask(INPUT)).rejects.toThrow("network");
    await expect(requestLv2Microtask(INPUT)).resolves.toEqual({
      microTask: "문서를 열기",
      generationSource: "gemini",
    });
    expect(apiFetch).toHaveBeenCalledTimes(2);
  });

  it("2.5초가 지나면 요청을 abort하고 실패로 확정한다", async () => {
    vi.useFakeTimers();
    vi.mocked(apiFetch).mockImplementation((_path, options) => {
      const requestOptions = options as { signal?: AbortSignal };
      return new Promise((_resolve, reject) => {
        requestOptions.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });

    const request = requestLv2Microtask(INPUT);
    const rejection = expect(request).rejects.toMatchObject({
      name: "AbortError",
    });
    await vi.advanceTimersByTimeAsync(LV2_MICROTASK_CLIENT_TIMEOUT_MS);

    await rejection;
  });

  it("서버 응답에 microTask가 없으면 fallback 가능한 실패로 처리한다", async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      data: { microTask: "", source: "gemini" },
    });

    await expect(requestLv2Microtask(INPUT)).rejects.toThrow(
      "invalid_microtask_response",
    );
  });

  it.each([
    ["gemini", "gemini"],
    ["rule_based", "rule_based"],
  ] as const)("API source=%s를 실제 generationSource로 유지한다", async (source, expected) => {
    vi.mocked(apiFetch).mockResolvedValue({
      data: { microTask: "문서 제목 한 줄 쓰기", source },
    });

    await expect(requestLv2Microtask(INPUT)).resolves.toEqual({
      microTask: "문서 제목 한 줄 쓰기",
      generationSource: expected,
    });
  });

  it("지원하지 않는 API source는 로컬 fallback 가능한 실패로 처리한다", async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      data: { microTask: "문서 제목 한 줄 쓰기", source: "unknown" },
    });

    await expect(requestLv2Microtask(INPUT)).rejects.toThrow(
      "invalid_microtask_source",
    );
  });
});

describe("requestLv3Microtask", () => {
  beforeEach(() => {
    resetLv3MicrotaskRequestsForTests();
    vi.mocked(apiFetch).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("동일한 진행 중 요청을 공유하고 서버 추적 참조를 운반한다", async () => {
    let resolveRequest!: (value: unknown) => void;
    vi.mocked(apiFetch).mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );

    const first = requestLv3Microtask(LV3_INPUT);
    const second = requestLv3Microtask({ ...LV3_INPUT });
    expect(first).toBe(second);
    expect(apiFetch).toHaveBeenCalledTimes(1);

    resolveRequest({
      data: {
        status: "generated",
        microTask: "목차 후보를 세 줄로 작성하기",
        source: "gemini",
        memoryEvidence: { sourceDoneEventId: "done-event-1" },
      },
    });

    await expect(Promise.all([first, second])).resolves.toEqual([
      {
        status: "generated",
        microTask: "목차 후보를 세 줄로 작성하기",
        generationSource: "gemini",
        memoryEvidence: { sourceDoneEventId: "done-event-1" },
      },
      {
        status: "generated",
        microTask: "목차 후보를 세 줄로 작성하기",
        generationSource: "gemini",
        memoryEvidence: { sourceDoneEventId: "done-event-1" },
      },
    ]);
  });

  it("과거 근거가 없어도 Gemini 결과를 반환한다", async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      data: {
        status: "generated",
        microTask: "첫 슬라이드에 발표 핵심 한 문장 쓰기",
        source: "gemini",
        memoryEvidence: null,
      },
    });

    await expect(requestLv3Microtask(LV3_INPUT)).resolves.toEqual({
      status: "generated",
      microTask: "첫 슬라이드에 발표 핵심 한 문장 쓰기",
      generationSource: "gemini",
      memoryEvidence: null,
    });
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/microtasks/lv3",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(LV3_INPUT),
      }),
    );
  });

  it("서버 fallback(source=rule_based) 응답도 정상 처리하고 generationSource를 그대로 유지한다", async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      data: {
        status: "generated",
        microTask: "문서에 핵심 주장 한 문장 쓰기",
        source: "rule_based",
        memoryEvidence: null,
      },
    });

    await expect(requestLv3Microtask(LV3_INPUT)).resolves.toEqual({
      status: "generated",
      microTask: "문서에 핵심 주장 한 문장 쓰기",
      generationSource: "rule_based",
      memoryEvidence: null,
    });
  });

  it("3초가 지나면 요청을 abort한다", async () => {
    vi.useFakeTimers();
    vi.mocked(apiFetch).mockImplementation((_path, options) => {
      const requestOptions = options as { signal?: AbortSignal };
      return new Promise((_resolve, reject) => {
        requestOptions.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });

    const request = requestLv3Microtask(LV3_INPUT);
    const rejection = expect(request).rejects.toMatchObject({
      name: "AbortError",
    });
    await vi.advanceTimersByTimeAsync(LV3_MICROTASK_CLIENT_TIMEOUT_MS);

    await rejection;
  });

  it("위조되거나 불완전한 근거 응답을 거부한다", async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      data: {
        status: "generated",
        microTask: "목차 후보를 세 줄로 작성하기",
        source: "gemini",
        memoryEvidence: { sourceDoneEventId: "" },
      },
    });

    await expect(requestLv3Microtask(LV3_INPUT)).rejects.toThrow(
      "invalid_lv3_microtask_response",
    );
  });

  it("gemini/rule_based가 아닌 source는 거부한다", async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      data: {
        status: "generated",
        microTask: "목차 후보를 세 줄로 작성하기",
        source: "unknown",
        memoryEvidence: null,
      },
    });

    await expect(requestLv3Microtask(LV3_INPUT)).rejects.toThrow(
      "invalid_lv3_microtask_response",
    );
  });
});
