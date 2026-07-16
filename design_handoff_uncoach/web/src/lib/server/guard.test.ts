import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { sameOrigin, rateLimit, clientIp } from "./guard";

function mockReq(headers: Record<string, string>): NextRequest {
  return { headers: { get: (k: string) => headers[k.toLowerCase()] ?? null } } as unknown as NextRequest;
}

describe("sameOrigin", () => {
  it("Origin이 host와 일치하면 통과", () => {
    expect(sameOrigin(mockReq({ origin: "https://app.example.com", host: "app.example.com" }))).toBe(true);
  });
  it("Origin이 다르면 차단", () => {
    expect(sameOrigin(mockReq({ origin: "https://evil.com", host: "app.example.com" }))).toBe(false);
  });
  it("Origin 없으면 통과(직접 접근 — 레이트리밋으로 방어)", () => {
    expect(sameOrigin(mockReq({ host: "app.example.com" }))).toBe(true);
  });
});

describe("rateLimit", () => {
  it("한도까지 허용 후 초과분 차단", () => {
    const key = "test:" + Math.random();
    for (let i = 0; i < 5; i++) expect(rateLimit(key, 5, 60_000)).toBe(true);
    expect(rateLimit(key, 5, 60_000)).toBe(false);
  });
  it("키가 다르면 독립적으로 카운트", () => {
    const a = "a:" + Math.random();
    const b = "b:" + Math.random();
    expect(rateLimit(a, 1, 60_000)).toBe(true);
    expect(rateLimit(a, 1, 60_000)).toBe(false);
    expect(rateLimit(b, 1, 60_000)).toBe(true);
  });
});

describe("clientIp", () => {
  it("x-forwarded-for의 첫 IP", () => {
    expect(clientIp(mockReq({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4");
  });
  it("없으면 unknown", () => {
    expect(clientIp(mockReq({}))).toBe("unknown");
  });
});
