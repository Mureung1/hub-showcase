import { describe, expect, it, vi } from "vitest";
import {
  assertSafeHttpUrl,
  extractPageMetadata,
  parsePageMetadata,
} from "./metadata";

const publicDns = async () => ["93.184.216.34"];

describe("parsePageMetadata", () => {
  it("일반 메타데이터와 Open Graph 값을 추출한다", () => {
    const metadata = parsePageMetadata(
      `<html><head>
        <title> Later 테스트 </title>
        <meta name="description" content=" 저장할 페이지 ">
        <meta property="og:title" content="OG 제목">
        <meta property="og:description" content="OG 설명">
        <meta property="og:site_name" content="Later">
        <meta property="og:type" content="article">
      </head></html>`,
      "https://example.com/"
    );

    expect(metadata).toEqual({
      url: "https://example.com/",
      title: "Later 테스트",
      description: "저장할 페이지",
      ogTitle: "OG 제목",
      ogDescription: "OG 설명",
      ogSiteName: "Later",
      ogType: "article",
    });
  });
});

describe("assertSafeHttpUrl", () => {
  it.each(["ftp://example.com", "file:///etc/passwd"])("HTTP가 아닌 %s를 거부한다", async (url) => {
    await expect(assertSafeHttpUrl(url, publicDns)).rejects.toThrow("HTTP 또는 HTTPS");
  });

  it.each([
    "http://localhost/test",
    "http://127.0.0.1/test",
    "http://10.0.0.1/test",
    "http://192.168.1.10/test",
    "http://[::1]/test",
  ])("로컬 또는 사설 주소 %s를 거부한다", async (url) => {
    await expect(assertSafeHttpUrl(url, publicDns)).rejects.toThrow();
  });

  it("DNS가 사설 IP를 반환하면 거부한다", async () => {
    await expect(assertSafeHttpUrl("https://example.com", async () => ["172.16.0.2"]))
      .rejects.toThrow("사설 또는 로컬");
  });
});

describe("extractPageMetadata", () => {
  it("HTML만 제한된 크기로 읽는다", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("<title>테스트</title>", {
        headers: { "content-type": "text/html; charset=utf-8" },
      })
    );

    const result = await extractPageMetadata("https://example.com", {
      fetchImpl,
      resolveAddresses: publicDns,
    });

    expect(result.title).toBe("테스트");
    expect(fetchImpl).toHaveBeenCalledWith(
      new URL("https://example.com"),
      expect.objectContaining({ redirect: "manual" })
    );
  });

  it("redirect 목적지도 다시 검사한다", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "http://127.0.0.1/admin" },
      })
    );

    await expect(
      extractPageMetadata("https://example.com", {
        fetchImpl,
        resolveAddresses: publicDns,
      })
    ).rejects.toThrow();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("HTML이 아닌 응답을 거부한다", async () => {
    await expect(
      extractPageMetadata("https://example.com/file.pdf", {
        fetchImpl: async () =>
          new Response("pdf", { headers: { "content-type": "application/pdf" } }),
        resolveAddresses: publicDns,
      })
    ).rejects.toThrow("HTML 웹페이지만");
  });

  it("응답 크기 제한을 적용한다", async () => {
    await expect(
      extractPageMetadata("https://example.com", {
        fetchImpl: async () =>
          new Response("123456", { headers: { "content-type": "text/html" } }),
        resolveAddresses: publicDns,
        maxBytes: 5,
      })
    ).rejects.toThrow("허용 크기");
  });

  it("timeout 신호로 요청을 중단한다", async () => {
    const fetchImpl = vi.fn<typeof fetch>((_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError"))
        );
      })
    );

    await expect(
      extractPageMetadata("https://example.com", {
        fetchImpl,
        resolveAddresses: publicDns,
        timeoutMs: 5,
      })
    ).rejects.toThrow();
  });
});
