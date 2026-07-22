import { describe, it, expect } from "vitest";
import { urlBase64ToUint8Array } from "./pushSubscribe.js";

describe("urlBase64ToUint8Array", () => {
  it("패딩 없는 base64url 문자열을 올바른 바이트 값의 Uint8Array로 변환한다 (happy path)", () => {
    // "hello" 의 base64url 표현("aGVsbG8")을 디코딩한 바이트 값과 비교.
    const result = urlBase64ToUint8Array("aGVsbG8");
    expect(Array.from(result)).toEqual([104, 101, 108, 108, 111]);
  });

  it("-, _ 문자가 섞인 base64url을 표준 base64로 치환해 디코딩한다 (경계)", () => {
    // 표준 base64로는 '+'/'/'가 되는 바이트를 포함한 문자열로 확인.
    // base64 "Pj8+Pw==" == bytes [62, 63, 62, 63] == base64url "Pj8-Pw"
    const result = urlBase64ToUint8Array("Pj8-Pw");
    expect(Array.from(result)).toEqual([62, 63, 62, 63]);
  });

  it("길이가 4의 배수인 입력(패딩 불필요)도 정확히 변환한다 (경계)", () => {
    // "test" 의 base64 표현("dGVzdA==")과 동일한 바이트를 만드는 4의 배수 케이스.
    const result = urlBase64ToUint8Array("dGVzdA");
    expect(Array.from(result)).toEqual([116, 101, 115, 116]);
  });

  it("빈 문자열이면 빈 Uint8Array를 반환한다 (경계)", () => {
    const result = urlBase64ToUint8Array("");
    expect(result).toHaveLength(0);
  });
});
