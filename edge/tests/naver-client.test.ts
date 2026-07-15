import { afterEach, describe, expect, it, vi } from "vitest";
import { NaverCanaryClient, type EdgeFetch } from "../src/provider-gateway/naver-client";
import { PROVIDER_RESPONSE_MAX_BYTES } from "../src/shared/constants";
import { APPROVED_SHA, jsonResponse, naverPayload } from "./fixtures";

const REQUEST = {
  approvedSha: APPROVED_SHA,
  display: 1,
  query: "서울 카페"
};

describe("Naver API HUB client", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("Local → 최소 1초 대기 → Blog 순서로 정확히 두 번 호출한다", async () => {
    const events: string[] = [];
    const urls: URL[] = [];
    const fetchImplementation: EdgeFetch = async (input) => {
      const url = new URL(String(input));
      urls.push(url);
      events.push(url.pathname === "/search/v1/local" ? "local" : "blog");
      return jsonResponse(
        naverPayload(url.pathname.endsWith("local") ? "local" : "blog")
      );
    };
    const client = new NaverCanaryClient(
      credentials(),
      fetchImplementation,
      () => 100,
      async (milliseconds) => {
        events.push(`sleep:${milliseconds}`);
      }
    );

    const summary = await client.run(REQUEST);

    expect(events).toEqual(["local", "sleep:1000", "blog"]);
    expect(summary.callCount).toBe(2);
    expect(summary.status).toBe("passed");
    expect(urls.map((url) => url.origin)).toEqual([
      "https://naverapihub.apigw.ntruss.com",
      "https://naverapihub.apigw.ntruss.com"
    ]);
    for (const url of urls) {
      expect(Array.from(url.searchParams.keys()).sort()).toEqual(["display", "query"]);
      expect(url.searchParams.get("query")).toBe("서울 카페");
      expect(url.searchParams.get("display")).toBe("1");
    }
  });

  it("한 endpoint가 실패해도 간격을 지키며 두 endpoint를 모두 검사하고 요약만 반환한다", async () => {
    let callCount = 0;
    const client = new NaverCanaryClient(
      credentials(),
      async (input) => {
        callCount += 1;
        const endpoint = new URL(String(input)).pathname.endsWith("local") ? "local" : "blog";
        return endpoint === "local"
          ? jsonResponse({ providerSecret: "never-return-this" }, 500)
          : jsonResponse(naverPayload("blog"));
      },
      () => 100,
      async () => undefined
    );

    const summary = await client.run(REQUEST);
    const serialized = JSON.stringify(summary);

    expect(callCount).toBe(2);
    expect(summary.status).toBe("failed");
    expect(serialized).not.toContain("never-return-this");
    expect(serialized).not.toContain("서울 카페");
    expect(serialized).not.toContain(credentials().key);
  });

  it("1 MiB를 초과하는 응답을 body 파싱 전에 거부한다", async () => {
    const client = new NaverCanaryClient(credentials(), async () =>
      new Response("{}", {
        headers: {
          "content-length": String(PROVIDER_RESPONSE_MAX_BYTES + 1),
          "content-type": "application/json"
        }
      })
    );

    const result = await client.search("local", REQUEST);

    expect(result.check).toMatchObject({
      errorCode: "PROVIDER_RESPONSE_TOO_LARGE",
      success: false
    });
    expect(result.payload).toBeNull();
  });

  it.each([
    ["text/plain", "비표준 media type"],
    [null, "누락된 media type"]
  ])("유효한 bounded JSON은 %s이어도 schema로 판정한다 (%s)", async (contentType, _description) => {
    const payload = JSON.stringify(naverPayload("local"));
    const client = new NaverCanaryClient(credentials(), async () => {
      return contentType === null
        ? new Response(payload)
        : new Response(payload, { headers: { "content-type": contentType } });
    });

    const result = await client.search("local", REQUEST);

    expect(result.check).toMatchObject({
      errorCode: null,
      jsonContentType: false,
      schemaValid: true,
      success: true
    });
    expect(result.payload).not.toBeNull();
  });

  it("비표준 media type이어도 malformed JSON은 거부한다", async () => {
    const client = new NaverCanaryClient(credentials(), async () =>
      new Response('{"items":', { headers: { "content-type": "text/plain" } })
    );

    const result = await client.search("local", REQUEST);

    expect(result.check).toMatchObject({
      errorCode: "PROVIDER_JSON_REJECTED",
      jsonContentType: false,
      success: false
    });
    expect(result.payload).toBeNull();
  });

  it("중복 object key가 있는 JSON은 schema 검사 전에 거부한다", async () => {
    const valid = JSON.stringify(naverPayload("local"));
    const duplicate = valid.replace('{"lastBuildDate":', '{"lastBuildDate":"duplicate","lastBuildDate":');
    const client = new NaverCanaryClient(credentials(), async () =>
      new Response(duplicate, { headers: { "content-type": "application/json" } })
    );

    const result = await client.search("local", REQUEST);

    expect(result.check).toMatchObject({
      errorCode: "PROVIDER_JSON_REJECTED",
      jsonContentType: true,
      success: false
    });
    expect(result.payload).toBeNull();
  });

  it("header 수신 후에도 body가 끝나지 않으면 전체 5초 timeout으로 중단한다", async () => {
    vi.useFakeTimers();
    const client = new NaverCanaryClient(credentials(), async () =>
      new Response(new ReadableStream<Uint8Array>(), {
        headers: { "content-type": "application/json" }
      })
    );

    const pending = client.search("local", REQUEST);
    await vi.advanceTimersByTimeAsync(5_000);
    const result = await pending;

    expect(result.check).toMatchObject({ errorCode: "PROVIDER_TIMEOUT", success: false });
  });
});

function credentials(): { key: string; keyId: string } {
  return {
    key: "testtesttest",
    keyId: "ididididid"
  };
}
