import { describe, it, expect } from "vitest";
import { parseLooseJson, extractText, extractSource, friendlyError, isUnavailable } from "./gemini";

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

describe("friendlyError — 폴백 발동 분류", () => {
  // 이게 어긋나면 키 문제인데도 조용히 데모 채점이 나가거나(오진), 일시적 한도인데 앱이 죽는다.
  it("429(사용량 소진)는 unavailable → 폴백 허용", () => {
    expect(isUnavailable(friendlyError(429, null))).toBe(true);
  });
  it("5xx(서버 불안정)는 unavailable → 폴백 허용", () => {
    expect(isUnavailable(friendlyError(503, null))).toBe(true);
  });
  it("400 키 오류는 unavailable 아님 → 정직한 에러", () => {
    const e = friendlyError(400, { error: { message: "API key not valid" } });
    expect(isUnavailable(e)).toBe(false);
    expect(e.message).toMatch(/키/);
  });
  it("403 권한 거부는 unavailable 아님 → 정직한 에러", () => {
    expect(isUnavailable(friendlyError(403, null))).toBe(false);
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
