import { describe, expect, it } from "vitest";
import { naverPlainText } from "../src/shared/naver-html-text";

interface ConformanceVector {
  id: string;
  input: string;
  expected: string;
}

const NAVER_HTML_CONFORMANCE_V1: readonly ConformanceVector[] = [
  {
    id: "NAVER_HTML_V1_NUMERIC",
    input: "카페 &#38; 디저트 &#x1F600; &#X41;",
    expected: "카페 & 디저트 😀 A"
  },
  {
    id: "NAVER_HTML_V1_NAMED_CASE",
    input: "&copy; &thetasym; &AMP; &apos; &unknown;",
    expected: "© ϑ &AMP; &apos; &unknown;"
  },
  {
    id: "NAVER_HTML_V1_MALFORMED_BOUNDED",
    input: "&amp;lt; &#0000065; &#00000065; &#x; &broken",
    expected: "&lt; A &#00000065; &#x; &broken"
  },
  {
    id: "NAVER_HTML_V1_NEGATIVE_OUT_OF_RANGE",
    input: "&#-1; &#x-1; &#1114112;",
    expected: "&#-1; &#x-1; &#1114112;"
  },
  {
    id: "NAVER_HTML_V1_ESCAPED_MARKUP",
    input: "&lt;b&gt;강남&lt;/b&gt; 카페",
    expected: "강남 카페"
  },
  {
    id: "NAVER_HTML_V1_UNICODE_WHITESPACE",
    input: "\u2003카페&nbsp;\tA\u2003B\u2003",
    expected: "카페 A B"
  }
] as const;

describe("Naver HTML plain-text conformance", () => {
  it.each(NAVER_HTML_CONFORMANCE_V1)("$id", ({ input, expected }) => {
    expect(naverPlainText(input)).toBe(expected);
  });
});
