import { describe, it, expect } from "vitest";
import { parseLooseJson, extractText, extractSource } from "./gemini";

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

describe("extractText", () => {
  it("여러 파트의 텍스트를 이어붙임", () => {
    const data = { candidates: [{ content: { parts: [{ text: "가" }, { text: "나" }] } }] };
    expect(extractText(data)).toBe("가나");
  });
  it("candidates가 없으면 빈 문자열", () => {
    expect(extractText({})).toBe("");
  });
  it("텍스트 없는 파트는 빈 문자열로 취급", () => {
    const data = { candidates: [{ content: { parts: [{ text: "a" }, {}] } }] };
    expect(extractText(data)).toBe("a");
  });
});

describe("extractSource", () => {
  it("grounding 첫 web 청크의 uri·title 반환", () => {
    const data = {
      candidates: [
        { groundingMetadata: { groundingChunks: [{ web: { uri: "https://a.com", title: "A뉴스" } }] } },
      ],
    };
    expect(extractSource(data)).toEqual({ uri: "https://a.com", title: "A뉴스" });
  });
  it("uri 없는 청크는 건너뛰고 첫 유효 uri 선택", () => {
    const data = {
      candidates: [
        {
          groundingMetadata: {
            groundingChunks: [{ web: { title: "제목만" } }, { web: { uri: "https://b.com" } }],
          },
        },
      ],
    };
    expect(extractSource(data)).toEqual({ uri: "https://b.com", title: "" });
  });
  it("grounding이 없으면 null", () => {
    expect(extractSource({ candidates: [{}] })).toBeNull();
  });
});
