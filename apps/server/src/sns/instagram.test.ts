import { describe, it, expect, vi, afterEach } from "vitest";
import {
  publishToInstagram,
  isInstagramLive,
  resolveApiHost,
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

describe("resolveApiHost — 토큰 종류로 호스트 판별", () => {
  afterEach(() => {
    delete process.env.IG_API_HOST;
  });

  it("IGAA… (Instagram Login) 토큰이면 graph.instagram.com", () => {
    expect(resolveApiHost("IGAAxxxxTOKEN")).toBe("graph.instagram.com");
  });

  it("EAA… (Facebook Login) 토큰이면 graph.facebook.com", () => {
    expect(resolveApiHost("EAAxxxxTOKEN")).toBe("graph.facebook.com");
  });

  it("토큰이 없으면 기본 graph.facebook.com", () => {
    expect(resolveApiHost(undefined)).toBe("graph.facebook.com");
  });

  it("IG_API_HOST가 있으면 토큰 종류와 무관하게 그 값이 이긴다", () => {
    process.env.IG_API_HOST = "graph.facebook.com";
    expect(resolveApiHost("IGAAxxxxTOKEN")).toBe("graph.facebook.com");
  });
});

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

/** 테스트에서 실제로 기다리지 않게 하는 sleep 스텁. */
const noSleep = async () => {};

describe("publishToInstagram — 실게시 성공 경로", () => {
  it("컨테이너→상태확인→게시 순서로 호출하고 caption·image_url을 담아 permalink를 반환한다", async () => {
    const calls: { url: string; init: { method: string; body?: string } }[] = [];
    const fetchImpl = vi.fn(async (url: string, init: { method: string; body?: string }) => {
      calls.push({ url, init });
      if (url.endsWith("/media")) return jsonRes({ id: "CONTAINER_1" });
      if (url.includes("fields=status_code")) return jsonRes({ status_code: "FINISHED" });
      if (url.endsWith("/media_publish")) return jsonRes({ id: "MEDIA_9" });
      return jsonRes({ permalink: "https://instagram.com/p/ABC123/" }); // permalink 조회
    }) as unknown as FetchLike;

    const r = await publishToInstagram(
      { caption: "오늘의 혜택 🎁" },
      { config: liveConfig, fetchImpl, sleepImpl: noSleep },
    );

    expect(r.posted).toBe(true);
    expect(r.permalink).toBe("https://instagram.com/p/ABC123/");

    // 호출 순서: media → status_code → media_publish → permalink
    expect(calls[0].url).toContain("/17841400000000000/media");
    expect(calls[1].url).toContain("CONTAINER_1?fields=status_code");
    expect(calls[2].url).toContain("/media_publish");

    // permalink는 미디어 최상위 노드(/{version}/{media-id})로 조회해야 한다.
    // /{ig-user-id}/{media-id}로 부르면 Meta가 100(nonexisting field)을 준다.
    expect(calls[3].url).toBe(
      "https://graph.facebook.com/v21.0/MEDIA_9?fields=permalink&access_token=TEST_TOKEN",
    );
    expect(calls[3].url).not.toContain("/17841400000000000/MEDIA_9");

    // 1단계 body에 caption·image_url 전달
    const createBody = JSON.parse(calls[0].init.body ?? "{}");
    expect(createBody.caption).toBe("오늘의 혜택 🎁");
    expect(createBody.image_url).toBe("https://example.com/promo.jpg");
    // 게시 body에 creation_id 전달
    const pubBody = JSON.parse(calls[2].init.body ?? "{}");
    expect(pubBody.creation_id).toBe("CONTAINER_1");
  });

  it("permalink 조회가 실패해도 게시는 성공으로 유지된다", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.endsWith("/media")) return jsonRes({ id: "C1" });
      if (url.includes("fields=status_code")) return jsonRes({ status_code: "FINISHED" });
      if (url.endsWith("/media_publish")) return jsonRes({ id: "M1" });
      return jsonRes({}, false, 500); // permalink 실패
    }) as unknown as FetchLike;

    const r = await publishToInstagram(
      { caption: "hi" },
      { config: liveConfig, fetchImpl, sleepImpl: noSleep },
    );
    expect(r.posted).toBe(true);
    expect(r.permalink).toBeUndefined();
  });
});

/**
 * 컨테이너 대기 — 실게시에서 실제로 터졌던 실패다.
 * IG가 image_url을 가져와 처리하기 전에 media_publish를 부르면 400 "Media ID is not available".
 * 이미지가 캐시돼 있으면 즉시 FINISHED라 폴링 없이도 우연히 성공해서, 이미지를 바꾼 날에만 터진다.
 */
describe("publishToInstagram — 컨테이너 준비 대기", () => {
  /** status_code를 순서대로 돌려주는 fetch 스텁. */
  function stubWithStatuses(statuses: string[]) {
    let seen = 0;
    const urls: string[] = [];
    const fetchImpl = vi.fn(async (url: string) => {
      urls.push(url);
      if (url.endsWith("/media")) return jsonRes({ id: "C1" });
      if (url.includes("fields=status_code")) {
        const s = statuses[Math.min(seen, statuses.length - 1)];
        seen += 1;
        return jsonRes({ status_code: s });
      }
      if (url.endsWith("/media_publish")) return jsonRes({ id: "M1" });
      return jsonRes({ permalink: "https://instagram.com/p/OK/" });
    }) as unknown as FetchLike;
    return { fetchImpl, urls };
  }

  it("IN_PROGRESS가 이어져도 FINISHED가 되면 게시한다", async () => {
    const { fetchImpl, urls } = stubWithStatuses(["IN_PROGRESS", "IN_PROGRESS", "FINISHED"]);
    const r = await publishToInstagram(
      { caption: "hi" },
      { config: liveConfig, fetchImpl, sleepImpl: noSleep },
    );

    expect(r.posted).toBe(true);
    expect(urls.filter((u) => u.includes("fields=status_code"))).toHaveLength(3);
  });

  it("FINISHED 전에는 media_publish를 부르지 않는다", async () => {
    const { fetchImpl, urls } = stubWithStatuses(["IN_PROGRESS", "FINISHED"]);
    await publishToInstagram(
      { caption: "hi" },
      { config: liveConfig, fetchImpl, sleepImpl: noSleep },
    );

    const publishAt = urls.findIndex((u) => u.endsWith("/media_publish"));
    const lastStatusAt = urls.map((u) => u.includes("fields=status_code")).lastIndexOf(true);
    expect(publishAt).toBeGreaterThan(lastStatusAt); // 상태확인이 모두 끝난 뒤에 게시
  });

  it("ERROR면 게시하지 않고 {posted:false}", async () => {
    const { fetchImpl, urls } = stubWithStatuses(["ERROR"]);
    const r = await publishToInstagram(
      { caption: "hi" },
      { config: liveConfig, fetchImpl, sleepImpl: noSleep },
    );

    expect(r.posted).toBe(false);
    expect(r.error).toContain("ERROR");
    expect(urls.some((u) => u.endsWith("/media_publish"))).toBe(false);
  });

  it("끝내 FINISHED가 안 되면 시간 초과로 {posted:false} (무한 대기 없음)", async () => {
    const { fetchImpl, urls } = stubWithStatuses(["IN_PROGRESS"]);
    const r = await publishToInstagram(
      { caption: "hi" },
      { config: liveConfig, fetchImpl, sleepImpl: noSleep },
    );

    expect(r.posted).toBe(false);
    expect(r.error).toContain("시간 초과");
    expect(urls.some((u) => u.endsWith("/media_publish"))).toBe(false);
  });
});
