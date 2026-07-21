import { describe, it, expect } from "vitest";
import { parseLooseJson } from "./gemini";

describe("parseLooseJson", () => {
  it("정상 JSON을 그대로 파싱", () => {
    expect(parseLooseJson('{"a":1,"b":"x"}')).toEqual({ a: 1, b: "x" });
  });
  it("트레일링 콤마를 관대하게 처리", () => {
    expect(parseLooseJson('{"a":1,"b":[1,2,],}')).toEqual({ a: 1, b: [1, 2] });
  });
  it("스마트 따옴표를 표준 따옴표로 변환", () => {
    const raw = "{“a”:1}";
    expect(parseLooseJson(raw)).toEqual({ a: 1 });
  });
  it("응답 앞뒤에 텍스트가 섞여 있어도 첫 JSON 블록만 추출", () => {
    expect(parseLooseJson('here is json: {"a":1} thanks')).toEqual({ a: 1 });
  });
  it("JSON 블록이 없으면 에러", () => {
    expect(() => parseLooseJson("no json here")).toThrow();
  });
});
