import { describe, expect, it, vi } from "vitest";
import {
  classifyWithFallback,
  validateLlmClassification,
} from "./llmClassification";

describe("validateLlmClassification", () => {
  it("허용된 LLM 분류를 내부 형식으로 변환한다", () => {
    expect(
      validateLlmClassification({
        category_main: "개발",
        category_sub: "프로그래밍",
      })
    ).toEqual({ categoryMain: "개발", categorySub: "프로그래밍" });
  });

  it("미분류의 소분류를 null로 정규화한다", () => {
    expect(
      validateLlmClassification({
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
    expect(validateLlmClassification(value)).toBeNull();
  });
});

describe("classifyWithFallback", () => {
  it("유효한 LLM 분류를 가장 먼저 사용한다", async () => {
    const llmRequest = vi.fn().mockResolvedValue({
      category_main: "콘텐츠",
      category_sub: "기사",
    });

    await expect(
      classifyWithFallback({ content: "React 개발 자료" }, llmRequest)
    ).resolves.toEqual({ categoryMain: "콘텐츠", categorySub: "기사" });
  });

  it("LLM 응답이 유효하지 않으면 기존 규칙을 사용한다", async () => {
    await expect(
      classifyWithFallback(
        { content: "React TypeScript 공부 자료" },
        async () => ({ category_main: "잘못된 분류", category_sub: "기타" })
      )
    ).resolves.toEqual({ categoryMain: "개발", categorySub: "프로그래밍" });
  });

  it("LLM 호출이 실패하면 기존 규칙을 사용한다", async () => {
    await expect(
      classifyWithFallback({ content: "다이어트 운동 루틴" }, async () => {
        throw new Error("OpenAI unavailable");
      })
    ).resolves.toEqual({ categoryMain: "건강", categorySub: "운동" });
  });

  it("LLM 없이도 기존 규칙을 사용한다", async () => {
    await expect(
      classifyWithFallback({ content: "https://youtu.be/example" })
    ).resolves.toEqual({ categoryMain: "영상", categorySub: "유튜브" });
  });

  it("LLM과 규칙 모두 분류하지 못하면 미분류와 null을 반환한다", async () => {
    await expect(
      classifyWithFallback(
        { content: "분류 단서가 없는 문장" },
        async () => {
          throw new Error("OpenAI unavailable");
        }
      )
    ).resolves.toEqual({ categoryMain: "미분류", categorySub: null });
  });
});
