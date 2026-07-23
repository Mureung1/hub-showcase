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
        categoryMain: "공부",
        categorySub: "프로그래밍",
        displayTitle: "React와 TypeScript 개발 가이드",
        summary: "React와 TypeScript를 함께 학습하는 개발 자료입니다.",
      })
    ).toEqual({
      categoryMain: "공부",
      categorySub: "프로그래밍",
      displayTitle: "React와 TypeScript 개발 가이드",
      summary: "React와 TypeScript를 함께 학습하는 개발 자료입니다.",
    });
  });

  it("미분류의 소분류를 null로 정규화한다", () => {
    expect(
      validateGeminiClassification({
        categoryMain: "미분류",
        categorySub: "기타",
        displayTitle: "저장한 웹 콘텐츠",
        summary: "요약할 정보가 부족한 웹 콘텐츠입니다.",
      })
    ).toEqual({
      categoryMain: "미분류",
      categorySub: null,
      displayTitle: "저장한 웹 콘텐츠",
      summary: "요약할 정보가 부족한 웹 콘텐츠입니다.",
    });
  });

  it.each([
    null,
    { categoryMain: "음식", categorySub: "한식" },
    {
      categoryMain: "공부",
      categorySub: "programming",
      displayTitle: "프로그래밍 공부",
      summary: "프로그래밍 공부 자료입니다.",
    },
    {
      categoryMain: "공부",
      categorySub: "가".repeat(31),
      displayTitle: "프로그래밍 공부",
      summary: "프로그래밍 공부 자료입니다.",
    },
    {
      categoryMain: "공부",
      categorySub: "프로그래밍",
      displayTitle: "프로그래밍 공부",
      summary: "프로그래밍 공부 자료입니다.",
      explanation: "설명",
    },
    {
      categoryMain: "공부",
      categorySub: "프로그래밍",
      displayTitle: "10 Linux concepts every developer should master",
      summary: "Linux file systems, shell commands, and permissions.",
    },
  ])("유효하지 않은 응답을 거부한다: %o", (value) => {
    expect(validateGeminiClassification(value)).toBeNull();
  });
});

describe("createGeminiClassifier", () => {
  it("Gemini SDK에 메타데이터와 Structured Output 설정을 전달한다", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        categoryMain: "공부",
        categorySub: "프로그래밍",
        displayTitle: "React TypeScript 학습 가이드",
        summary: "React와 TypeScript 핵심 내용을 다루는 학습 자료입니다.",
      }),
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
    ).resolves.toEqual({
      categoryMain: "공부",
      categorySub: "프로그래밍",
      displayTitle: "React TypeScript 학습 가이드",
      summary: "React와 TypeScript 핵심 내용을 다루는 학습 자료입니다.",
    });

    expect(generateContent).toHaveBeenCalledWith({
      model: "test-model",
      contents: [
        {
          text: expect.stringContaining('"original_content":"https://example.com/article"'),
        },
      ],
      config: expect.objectContaining({
        systemInstruction: expect.stringContaining("untrusted"),
        responseMimeType: "application/json",
        responseJsonSchema: expect.any(Object),
      }),
    });
  });

  it("이미지와 텍스트를 Gemini inline data 요청에 함께 전달한다", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        categoryMain: "여행",
        categorySub: "관광지",
        displayTitle: "제주도 관광지 여행 사진",
        summary: "제주도 관광지의 풍경을 담은 여행 사진입니다.",
      }),
    });
    const classifier = createGeminiClassifier(
      "test-key",
      "test-model",
      { models: { generateContent } } as never
    );

    await classifier({
      content: "제주도에서 찍은 사진",
      image: {
        data: "base64-image",
        mimeType: "image/png",
      },
    });

    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: [
          { text: expect.stringContaining("제주도에서 찍은 사진") },
          {
            inlineData: {
              data: "base64-image",
              mimeType: "image/png",
            },
          },
        ],
      })
    );
  });

  it("소분류가 불명확한 정상 응답의 null을 유지한다", () => {
    expect(
      validateGeminiClassification({
        categoryMain: "콘텐츠",
        categorySub: null,
        displayTitle: "오늘 읽을 주요 콘텐츠",
        summary: "오늘 읽어볼 만한 주요 내용을 정리한 콘텐츠입니다.",
      })
    ).toEqual({
      categoryMain: "콘텐츠",
      categorySub: null,
      displayTitle: "오늘 읽을 주요 콘텐츠",
      summary: "오늘 읽어볼 만한 주요 내용을 정리한 콘텐츠입니다.",
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
      categoryMain: "콘텐츠",
      categorySub: "기사",
      displayTitle: "React 개발 동향 정리",
      summary: "React 개발 동향과 관련 자료를 간단히 정리합니다.",
    });

    await expect(
      classifyWithFallback({ content: "React 개발 자료" }, geminiRequest)
    ).resolves.toEqual({
      categoryMain: "콘텐츠",
      categorySub: "기사",
      displayTitle: "React 개발 동향 정리",
      summary: "React 개발 동향과 관련 자료를 간단히 정리합니다.",
    });
  });

  it("Gemini 응답이 유효하지 않으면 기존 규칙을 사용한다", async () => {
    await expect(
      classifyWithFallback(
        { content: "React TypeScript 공부 자료" },
        async () => ({ categoryMain: "잘못된 분류", categorySub: "기타" })
      )
    ).resolves.toEqual({
      categoryMain: "공부",
      categorySub: "프로그래밍",
      displayTitle: "React TypeScript 공부 자료",
      summary: "React TypeScript 공부 자료",
    });
  });

  it("Gemini API 오류가 발생하면 기존 규칙을 사용한다", async () => {
    await expect(
      classifyWithFallback({ content: "다이어트 운동 루틴" }, async () => {
        throw new Error("Gemini unavailable");
      })
    ).resolves.toEqual({
      categoryMain: "건강",
      categorySub: "운동",
      displayTitle: "다이어트 운동 루틴",
      summary: "다이어트 운동 루틴",
    });
  });

  it("Gemini 없이도 기존 규칙을 사용한다", async () => {
    await expect(
      classifyWithFallback({ content: "https://youtu.be/example" })
    ).resolves.toEqual({
      categoryMain: "영상",
      categorySub: "유튜브",
      displayTitle: "유튜브 관련 콘텐츠",
      summary: "유튜브 관련 콘텐츠의 핵심 내용을 다루는 원문입니다.",
    });
  });

  it("Gemini와 규칙 모두 분류하지 못하면 미분류와 null을 반환한다", async () => {
    await expect(
      classifyWithFallback(
        { content: "분류 단서가 없는 문장" },
        async () => {
          throw new Error("Gemini unavailable");
        }
      )
    ).resolves.toEqual({
      categoryMain: "미분류",
      categorySub: null,
      displayTitle: "분류 단서가 없는 문장",
      summary: "분류 단서가 없는 문장",
    });
  });

  it("이미지만 있을 때 Gemini 호출 실패 시 파일명으로 분류하지 않는다", async () => {
    await expect(
      classifyWithFallback(
        {
          content: "",
          image: { data: "base64-image", mimeType: "image/jpeg" },
        },
        async () => {
          throw new Error("Gemini unavailable");
        }
      )
    ).resolves.toEqual({
      categoryMain: "미분류",
      categorySub: null,
      displayTitle: "저장한 이미지",
      summary: "저장한 이미지로 분류된 이미지입니다.",
    });
  });

  it("유효한 Gemini 이미지 분류를 사용한다", async () => {
    await expect(
      classifyWithFallback(
        {
          content: "산책 중 찍은 사진",
          image: { data: "base64-image", mimeType: "image/jpeg" },
        },
        async () => ({
          categoryMain: "여행",
          categorySub: "풍경",
          displayTitle: "산책길 풍경 여행 사진",
          summary: "산책길에서 촬영한 풍경을 담은 여행 사진입니다.",
        })
      )
    ).resolves.toEqual({
      categoryMain: "여행",
      categorySub: "풍경",
      displayTitle: "산책길 풍경 여행 사진",
      summary: "산책길에서 촬영한 풍경을 담은 여행 사진입니다.",
    });
  });

  it("이미지 응답 검증 실패 시 함께 입력한 텍스트로 fallback한다", async () => {
    await expect(
      classifyWithFallback(
        {
          content: "운동 루틴",
          image: { data: "base64-image", mimeType: "image/webp" },
        },
        async () => ({ categoryMain: "잘못된 분류", categorySub: null })
      )
    ).resolves.toEqual({
      categoryMain: "건강",
      categorySub: "운동",
      displayTitle: "운동 루틴",
      summary: "운동 루틴",
    });
  });

  it("영어 제목과 요약은 거부하고 한국어 fallback을 사용한다", async () => {
    await expect(
      classifyWithFallback(
        {
          content: "https://x.com/example/status/1",
          metadata: {
            url: "https://x.com/example/status/1",
            title: "10 Linux concepts every developer should master",
            description: "Linux file systems, shell commands, and permissions.",
            ogTitle: "Developer tips on X",
            ogDescription: "A list of Linux concepts.",
            ogSiteName: "X",
            ogType: "article",
          },
        },
        async () => ({
          categoryMain: "공부",
          categorySub: "리눅스",
          displayTitle: "10 Linux concepts every developer should master",
          summary: "Linux file systems, shell commands, and permissions.",
        })
      )
    ).resolves.toEqual({
      categoryMain: "SNS",
      categorySub: "X",
      displayTitle: "X 관련 콘텐츠",
      summary: "X 관련 콘텐츠의 핵심 내용을 다루는 원문입니다.",
    });
  });
});
