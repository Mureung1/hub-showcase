import { describe, expect, it, vi } from "vitest";
import {
  classifyWithFallback,
  createConfiguredGeminiClassifier,
  createGeminiClassifier,
  validateGeminiClassification,
} from "./geminiClassification";

describe("validateGeminiClassification", () => {
  it("허용된 Gemini 분류를 내부 형식으로 변환한다", () => {
    expect(
      validateGeminiClassification({
        category_main: "개발",
        category_sub: "프로그래밍",
      })
    ).toEqual({ categoryMain: "개발", categorySub: "프로그래밍" });
  });

  it("미분류의 소분류를 null로 정규화한다", () => {
    expect(
      validateGeminiClassification({
        category_main: "미분류",
        category_sub: "기타",
      })
    ).toEqual({ categoryMain: "미분류", categorySub: null });
  });

  it.each([
    null,
    { category_main: "음식", category_sub: "한식" },
    { category_main: "개발", category_sub: null },
    { category_main: "개발", category_sub: "programming" },
    { category_main: "개발", category_sub: "가".repeat(31) },
    { category_main: "개발", category_sub: "프로그래밍", explanation: "설명" },
  ])("유효하지 않은 응답을 거부한다: %o", (value) => {
    expect(validateGeminiClassification(value)).toBeNull();
  });
});

describe("createGeminiClassifier", () => {
  it("Gemini SDK에 메타데이터와 Structured Output 설정을 전달한다", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      text: JSON.stringify({ category_main: "개발", category_sub: "프로그래밍" }),
    });
    const classifier = createGeminiClassifier(
      "test-key",
      "test-model",
      { models: { generateContent } } as never
    );

    await expect(
      classifier({
        content: "https://example.com/article",
        metadata: {
          url: "https://example.com/article",
          title: "React 학습",
          description: "TypeScript 개발 자료",
          ogTitle: "React",
          ogDescription: "프로그래밍 안내",
          ogSiteName: "Example",
          ogType: "article",
        },
      })
    ).resolves.toEqual({ category_main: "개발", category_sub: "프로그래밍" });

    expect(generateContent).toHaveBeenCalledWith({
      model: "test-model",
      contents: expect.stringContaining('"original_content":"https://example.com/article"'),
      config: expect.objectContaining({
        systemInstruction: expect.stringContaining("untrusted"),
        responseMimeType: "application/json",
        responseJsonSchema: expect.any(Object),
      }),
    });
  });

  it("Gemini 응답이 비어 있으면 실패한다", async () => {
    const classifier = createGeminiClassifier(
      "test-key",
      "test-model",
      { models: { generateContent: vi.fn().mockResolvedValue({}) } } as never
    );
    await expect(classifier({ content: "테스트" })).rejects.toThrow(
      "Gemini가 분류 결과를 반환하지 않았습니다."
    );
  });
});

describe("createConfiguredGeminiClassifier", () => {
  it.each([
    {},
    { GEMINI_API_KEY: "key" },
    { GEMINI_MODEL: "model" },
    { GEMINI_API_KEY: " ", GEMINI_MODEL: "model" },
  ])("API 키와 모델이 모두 없으면 Gemini를 설정하지 않는다: %o", (environment) => {
    const factory = vi.fn();
    expect(createConfiguredGeminiClassifier(environment, factory)).toBeNull();
    expect(factory).not.toHaveBeenCalled();
  });

  it("API 키와 모델이 모두 있으면 Gemini를 설정한다", () => {
    const classifier = vi.fn();
    const factory = vi.fn().mockReturnValue(classifier);
    expect(
      createConfiguredGeminiClassifier(
        { GEMINI_API_KEY: " key ", GEMINI_MODEL: " model " },
        factory
      )
    ).toBe(classifier);
    expect(factory).toHaveBeenCalledWith("key", "model");
  });
});

describe("classifyWithFallback", () => {
  it("유효한 Gemini 분류를 가장 먼저 사용한다", async () => {
    const geminiRequest = vi.fn().mockResolvedValue({
      category_main: "콘텐츠",
      category_sub: "기사",
    });

    await expect(
      classifyWithFallback({ content: "React 개발 자료" }, geminiRequest)
    ).resolves.toEqual({ categoryMain: "콘텐츠", categorySub: "기사" });
  });

  it("Gemini 응답이 유효하지 않으면 기존 규칙을 사용한다", async () => {
    await expect(
      classifyWithFallback(
        { content: "React TypeScript 공부 자료" },
        async () => ({ category_main: "잘못된 분류", category_sub: "기타" })
      )
    ).resolves.toEqual({ categoryMain: "개발", categorySub: "프로그래밍" });
  });

  it("Gemini API 오류가 발생하면 기존 규칙을 사용한다", async () => {
    await expect(
      classifyWithFallback({ content: "다이어트 운동 루틴" }, async () => {
        throw new Error("Gemini unavailable");
      })
    ).resolves.toEqual({ categoryMain: "건강", categorySub: "운동" });
  });

  it("Gemini 없이도 기존 규칙을 사용한다", async () => {
    await expect(
      classifyWithFallback({ content: "https://youtu.be/example" })
    ).resolves.toEqual({ categoryMain: "영상", categorySub: "유튜브" });
  });

  it("Gemini와 규칙 모두 분류하지 못하면 미분류와 null을 반환한다", async () => {
    await expect(
      classifyWithFallback(
        { content: "분류 단서가 없는 문장" },
        async () => {
          throw new Error("Gemini unavailable");
        }
      )
    ).resolves.toEqual({ categoryMain: "미분류", categorySub: null });
  });
});
