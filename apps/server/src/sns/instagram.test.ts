import { describe, it, expect, vi } from "vitest";
import {
  publishToInstagram,
  isInstagramLive,
  type InstagramConfig,
  type FetchLike,
  type FetchResponse,
} from "./instagram";

const liveConfig: InstagramConfig = {
  userId: "17841400000000000",
  accessToken: "TEST_TOKEN",
  apiHost: "graph.facebook.com",
  apiVersion: "v21.0",
  imageUrl: "https://example.com/promo.jpg",
};

/** 테스트용 fetch 응답 생성. */
function jsonRes(body: unknown, ok = true, status = 200): FetchResponse {
  return { ok, status, json: async () => body };
}

describe("isInstagramLive", () => {
  it("userId·accessToken이 모두 있어야 live", () => {
    expect(isInstagramLive(liveConfig)).toBe(true);
    expect(isInstagramLive({ ...liveConfig, accessToken: undefined })).toBe(false);
    expect(isInstagramLive({ ...liveConfig, userId: undefined })).toBe(false);
  });
});

describe("publishToInstagram — 미게시 강등 (예외 없음)", () => {
  it("토큰이 없으면 게시하지 않고 {posted:false}", async () => {
    const fetchImpl = vi.fn();
    const r = await publishToInstagram(
      { caption: "안녕" },
      { config: { ...liveConfig, accessToken: undefined }, fetchImpl },
    );
    expect(r.posted).toBe(false);
    expect(r.error).toContain("토큰");
    expect(fetchImpl).not.toHaveBeenCalled(); // 실네트워크 없음
  });

  it("이미지 URL이 없으면 {posted:false} (Instagram은 이미지 필수)", async () => {
    const fetchImpl = vi.fn();
    const r = await publishToInstagram(
      { caption: "안녕" },
      { config: { ...liveConfig, imageUrl: undefined }, fetchImpl },
    );
    expect(r.posted).toBe(false);
    expect(r.error).toContain("이미지");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("컨테이너 생성이 실패하면 {posted:false}, 게시 호출은 안 한다", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonRes({ error: { message: "Invalid image URL" } }, false, 400),
    ) as unknown as FetchLike;
    const r = await publishToInstagram({ caption: "안녕" }, { config: liveConfig, fetchImpl });
    expect(r.posted).toBe(false);
    expect(r.error).toContain("컨테이너 생성 실패");
    expect(fetchImpl).toHaveBeenCalledTimes(1); // media만, media_publish 안 감
  });

  it("fetch가 예외를 던져도 throw하지 않고 {posted:false}", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as FetchLike;
    const r = await publishToInstagram({ caption: "안녕" }, { config: liveConfig, fetchImpl });
    expect(r.posted).toBe(false);
    expect(r.error).toContain("network down");
  });
});

describe("publishToInstagram — 실게시 성공 경로", () => {
  it("2단계(컨테이너→게시) 순서로 호출하고 caption·image_url을 담아 permalink를 반환한다", async () => {
    const calls: { url: string; init: { method: string; body?: string } }[] = [];
    const fetchImpl = vi.fn(async (url: string, init: { method: string; body?: string }) => {
      calls.push({ url, init });
      if (url.endsWith("/media")) return jsonRes({ id: "CONTAINER_1" });
      if (url.endsWith("/media_publish")) return jsonRes({ id: "MEDIA_9" });
      return jsonRes({ permalink: "https://instagram.com/p/ABC123/" }); // permalink 조회
    }) as unknown as FetchLike;

    const r = await publishToInstagram(
      { caption: "오늘의 혜택 🎁" },
      { config: liveConfig, fetchImpl },
    );

    expect(r.posted).toBe(true);
    expect(r.permalink).toBe("https://instagram.com/p/ABC123/");

    // 호출 순서: media → media_publish → permalink 조회
    expect(calls[0].url).toContain("/17841400000000000/media");
    expect(calls[1].url).toContain("/media_publish");
    expect(calls[2].url).toContain("fields=permalink");

    // 1단계 body에 caption·image_url·creation 없음 확인
    const createBody = JSON.parse(calls[0].init.body ?? "{}");
    expect(createBody.caption).toBe("오늘의 혜택 🎁");
    expect(createBody.image_url).toBe("https://example.com/promo.jpg");
    // 2단계 body에 creation_id 전달
    const pubBody = JSON.parse(calls[1].init.body ?? "{}");
    expect(pubBody.creation_id).toBe("CONTAINER_1");
  });

  it("permalink 조회가 실패해도 게시는 성공으로 유지된다", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.endsWith("/media")) return jsonRes({ id: "C1" });
      if (url.endsWith("/media_publish")) return jsonRes({ id: "M1" });
      return jsonRes({}, false, 500); // permalink 실패
    }) as unknown as FetchLike;

    const r = await publishToInstagram({ caption: "hi" }, { config: liveConfig, fetchImpl });
    expect(r.posted).toBe(true);
    expect(r.permalink).toBeUndefined();
  });
});
