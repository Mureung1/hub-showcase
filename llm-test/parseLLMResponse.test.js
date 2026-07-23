import { describe, it, expect } from "vitest";
import { parseLLMResponse } from "./parseLLMResponse.js";

describe("parseLLMResponse", () => {
  it("정상 케이스: 코드펜스 없는 순수 JSON 문자열을 파싱한다", () => {
    const input = '{"keyword":"취업고민","emotion":"불안"}';
    const result = parseLLMResponse(input);
    expect(result).toEqual({ keyword: "취업고민", emotion: "불안" });
  });

  it("코드펜스가 있는 경우: ```json ... ``` 를 제거하고 파싱한다", () => {
    const input = '```json\n{"keyword":"운동습관","emotion":"찝찝함"}\n```';
    const result = parseLLMResponse(input);
    expect(result).toEqual({ keyword: "운동습관", emotion: "찝찝함" });
  });

  it("빈 문자열이면 에러가 발생한다", () => {
    expect(() => parseLLMResponse("")).toThrow();
  });

  it("잘못된 형식(따옴표 없는 JSON)이면 에러가 발생한다", () => {
    const input = "{keyword: 취업고민}";
    expect(() => parseLLMResponse(input)).toThrow();
  });
});