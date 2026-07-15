import { afterEach, describe, expect, it, vi } from "vitest";
import { FetchProviderGatewayClient } from "../src/release-gate/provider-gateway-client";
import { APPROVED_SHA, jsonResponse, passedCanarySummary } from "./fixtures";

describe("Release Gate의 Provider Gateway client", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("고정 canary 경로와 내부 고정 입력만 전송한다", async () => {
    let capturedUrl: URL | undefined;
    let capturedInit: RequestInit | undefined;
    const client = new FetchProviderGatewayClient(
      "https://provider-gateway.example",
      async (input, init) => {
        capturedUrl = new URL(String(input));
        capturedInit = init;
        return jsonResponse(passedCanarySummary());
      }
    );

    await expect(client.run("fixture-token", APPROVED_SHA)).resolves.toEqual(
      passedCanarySummary()
    );
    expect(capturedUrl?.toString()).toBe(
      "https://provider-gateway.example/v1/canaries/naver"
    );
    expect(capturedInit?.redirect).toBe("error");
    expect(JSON.parse(String(capturedInit?.body))).toEqual({
      approvedSha: APPROVED_SHA,
      display: 1,
      query: "서울 카페"
    });
  });

  it("header 수신 뒤 body가 끝나지 않아도 전체 canary budget 뒤 중단한다", async () => {
    vi.useFakeTimers();
    const client = new FetchProviderGatewayClient(
      "https://provider-gateway.example",
      async () =>
        new Response(new ReadableStream<Uint8Array>(), {
          headers: { "content-type": "application/json" }
        })
    );

    const pending = client.run("fixture-token", APPROVED_SHA);
    const assertion = expect(pending).rejects.toMatchObject({
      code: "PROVIDER_GATEWAY_TIMEOUT"
    });
    await vi.advanceTimersByTimeAsync(15_000);
    await assertion;
  });

  it("non-2xx가 성공 summary 형태를 반환해도 거부한다", async () => {
    const client = new FetchProviderGatewayClient(
      "https://provider-gateway.example",
      async () => jsonResponse(passedCanarySummary(), 502)
    );

    await expect(client.run("fixture-token", APPROVED_SHA)).rejects.toMatchObject({
      code: "PROVIDER_GATEWAY_REJECTED"
    });
  });
});
