import { describe, expect, it } from "vitest";
import {
  enforceFixedCanary,
  parseNaverSearchQuery,
  parseRedactedCanarySummary
} from "../src/provider-gateway/canary-contract";
import { SecurityBoundaryError } from "../src/shared/errors";
import { APPROVED_SHA, passedCanarySummary } from "./fixtures";

describe("Naver 검색 Gateway 계약", () => {
  it.each([
    ["local", 1],
    ["local", 5],
    ["blog", 1],
    ["blog", 10]
  ] as const)("%s display=%i 경계를 허용한다", (endpoint, display) => {
    const parsed = parseNaverSearchQuery(
      new URL(`https://gateway.invalid/search/v1/${endpoint}?query=서울%20카페&display=${display}`),
      APPROVED_SHA,
      endpoint
    );
    expect(parsed).toEqual({ approvedSha: APPROVED_SHA, display, query: "서울 카페" });
  });

  it.each([
    ["local", 6],
    ["blog", 11]
  ] as const)("%s display=%i 상한 초과를 거부한다", (endpoint, display) => {
    expect(() =>
      parseNaverSearchQuery(
        new URL(`https://gateway.invalid/search/v1/${endpoint}?query=test&display=${display}`),
        APPROVED_SHA,
        endpoint
      )
    ).toThrowError(SecurityBoundaryError);
  });

  it.each([
    "?query=test&display=1&start=1",
    "?query=test&display=1&display=2",
    "?query=test&display=01",
    "?query=%20test&display=1"
  ])("허용 목록 밖 또는 비정규 query string을 거부한다: %s", (search) => {
    expect(() =>
      parseNaverSearchQuery(
        new URL(`https://gateway.invalid/search/v1/local${search}`),
        APPROVED_SHA,
        "local"
      )
    ).toThrowError(SecurityBoundaryError);
  });

  it("canary 입력은 고정 query와 display만 허용한다", () => {
    expect(() =>
      enforceFixedCanary({ approvedSha: APPROVED_SHA, display: 2, query: "서울 카페" })
    ).toThrowError(SecurityBoundaryError);
  });

  it("요약의 임의 오류 문자열과 상태 불일치를 거부한다", () => {
    const summary = passedCanarySummary();
    summary.status = "failed";
    summary.checks[0] = {
      ...summary.checks[0],
      errorCode: "UNBOUNDED_PROVIDER_TEXT",
      itemCount: null,
      schemaValid: false,
      success: false
    };

    expect(() => parseRedactedCanarySummary(summary, APPROVED_SHA))
      .toThrowError(SecurityBoundaryError);
  });

  it("Content-Type은 관측값이며 유효 JSON·schema 성공을 뒤집지 않는다", () => {
    const summary = passedCanarySummary();
    summary.checks[0] = { ...summary.checks[0], jsonContentType: false };

    expect(parseRedactedCanarySummary(summary, APPROVED_SHA).checks[0])
      .toMatchObject({ success: true, jsonContentType: false, schemaValid: true });
  });

  it("폐기된 Content-Type 전용 오류 코드를 허용하지 않는다", () => {
    const summary = passedCanarySummary();
    summary.status = "failed";
    summary.checks[0] = {
      ...summary.checks[0],
      errorCode: "PROVIDER_CONTENT_TYPE_REJECTED",
      itemCount: null,
      jsonContentType: false,
      schemaValid: false,
      success: false
    };

    expect(() => parseRedactedCanarySummary(summary, APPROVED_SHA))
      .toThrowError(SecurityBoundaryError);
  });
});
