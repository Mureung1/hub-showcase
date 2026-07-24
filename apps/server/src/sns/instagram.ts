/**
 * Instagram 게시 (Content Publishing API, 2단계: 컨테이너 생성 → 게시).
 *
 * Solapi(sms/solapi.ts)와 같은 원칙 — 토큰(IG_USER_ID·IG_ACCESS_TOKEN)이 없으면 실게시하지
 * 않고 { posted:false }를 돌려준다. **본인 테스트 프로페셔널 계정에만** 게시하며(타인 계정은
 * App Review가 필요해 스코프 밖·모의 유지), 앱 개발모드에선 본인 계정에 App Review 없이 게시 가능.
 *
 * ⚠️ Instagram은 텍스트만 게시 불가 — 반드시 공개 접근 가능한 image_url이 필요하다.
 *    (IG_DEMO_IMAGE_URL: 고정 프로모 이미지. 캠페인별 카드 생성은 후속.)
 *
 * best-effort: 어떤 실패(토큰없음·이미지없음·API오류·네트워크)에도 예외를 던지지 않고
 * { posted:false, error }를 반환한다 → 발송 라우트가 이걸 받아 FE 복사 폴백으로 강등한다.
 */

/** 테스트에서 주입 가능한 최소 fetch 형태. */
export type FetchInit = { method: string; headers?: Record<string, string>; body?: string };
export type FetchResponse = { ok: boolean; status: number; json: () => Promise<unknown> };
export type FetchLike = (url: string, init: FetchInit) => Promise<FetchResponse>;

export interface InstagramConfig {
  userId?: string;
  accessToken?: string;
  /** 기본 graph.facebook.com (Facebook Login 방식). IG Login 방식이면 graph.instagram.com. */
  apiHost: string;
  apiVersion: string;
  /** 게시 이미지 URL (공개 접근 가능해야 IG가 가져간다). */
  imageUrl?: string;
}

export interface InstagramDeps {
  config?: InstagramConfig;
  fetchImpl?: FetchLike;
}

export interface PublishParams {
  caption: string;
  /** config.imageUrl 대신 사용할 이미지 URL(선택). */
  imageUrl?: string;
}

export interface InstagramResult {
  posted: boolean;
  permalink?: string;
  error?: string;
}

/** env에서 IG 설정을 읽는다(호출 시점에 읽어 테스트가 env를 제어할 수 있게 한다). */
export function readInstagramConfig(): InstagramConfig {
  return {
    userId: process.env.IG_USER_ID,
    accessToken: process.env.IG_ACCESS_TOKEN,
    apiHost: process.env.IG_API_HOST || "graph.facebook.com",
    apiVersion: process.env.IG_API_VERSION || "v21.0",
    imageUrl: process.env.IG_DEMO_IMAGE_URL,
  };
}

/** 실게시 가능 여부 (userId·accessToken이 모두 있을 때만). */
export function isInstagramLive(config: InstagramConfig): boolean {
  return Boolean(config.userId && config.accessToken);
}

interface IgIdResponse {
  id?: string;
  error?: { message?: string };
}
interface IgPermalinkResponse {
  permalink?: string;
}

/** 게시된 미디어의 permalink를 조회한다(best-effort — 실패해도 게시 성공은 유지). */
async function fetchPermalink(
  base: string,
  mediaId: string,
  accessToken: string,
  doFetch: FetchLike,
): Promise<string | undefined> {
  try {
    const url = `${base}/${mediaId}?fields=permalink&access_token=${encodeURIComponent(accessToken)}`;
    const res = await doFetch(url, { method: "GET" });
    if (!res.ok) return undefined;
    const json = (await res.json()) as IgPermalinkResponse;
    return json.permalink;
  } catch {
    return undefined;
  }
}

/**
 * 인스타그램에 캡션+이미지를 게시한다(또는 미게시로 강등).
 * 1) POST /{ig-user-id}/media       (image_url + caption)  → creation_id
 * 2) POST /{ig-user-id}/media_publish (creation_id)         → media_id
 * 3) GET  /{media-id}?fields=permalink (best-effort)
 */
export async function publishToInstagram(
  params: PublishParams,
  deps: InstagramDeps = {},
): Promise<InstagramResult> {
  const config = deps.config ?? readInstagramConfig();
  const doFetch: FetchLike = deps.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
  const imageUrl = params.imageUrl ?? config.imageUrl;

  if (!isInstagramLive(config)) {
    return { posted: false, error: "IG 토큰 미설정 — 복사 폴백" };
  }
  if (!imageUrl) {
    return { posted: false, error: "게시 이미지 URL 미설정 (Instagram은 이미지 필수) — 복사 폴백" };
  }

  const base = `https://${config.apiHost}/${config.apiVersion}/${config.userId}`;
  const token = config.accessToken as string;

  try {
    // 1) 미디어 컨테이너 생성
    const createRes = await doFetch(`${base}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageUrl, caption: params.caption, access_token: token }),
    });
    const createJson = (await createRes.json().catch(() => ({}))) as IgIdResponse;
    if (!createRes.ok || !createJson.id) {
      return { posted: false, error: `컨테이너 생성 실패(${createRes.status}): ${createJson.error?.message ?? "unknown"}` };
    }

    // 2) 게시
    const pubRes = await doFetch(`${base}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: createJson.id, access_token: token }),
    });
    const pubJson = (await pubRes.json().catch(() => ({}))) as IgIdResponse;
    if (!pubRes.ok || !pubJson.id) {
      return { posted: false, error: `게시 실패(${pubRes.status}): ${pubJson.error?.message ?? "unknown"}` };
    }

    // 3) permalink (best-effort)
    const permalink = await fetchPermalink(base, pubJson.id, token, doFetch);
    return { posted: true, permalink };
  } catch (e) {
    return { posted: false, error: e instanceof Error ? e.message : "IG 게시 오류" };
  }
}
