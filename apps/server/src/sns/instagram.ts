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
  /** 컨테이너 대기 간격 주입(테스트가 실제로 기다리지 않게). 기본은 setTimeout. */
  sleepImpl?: (ms: number) => Promise<void>;
}

/** 컨테이너 준비 폴링 — IG는 보통 1~3초면 FINISHED가 된다. */
const CONTAINER_POLL_ATTEMPTS = 12;
const CONTAINER_POLL_INTERVAL_MS = 1000;

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

/**
 * 토큰 접두사로 API 호스트를 판별한다 (IG_API_HOST가 있으면 그 값이 항상 이긴다).
 *
 * - `IGAA…` = Instagram Login 방식 토큰 → **graph.instagram.com**
 * - `EAA…`  = Facebook Login 방식 토큰  → **graph.facebook.com**
 *
 * 짝이 안 맞으면 Meta가 `190 Cannot parse access token`을 돌려준다. 메시지가 토큰 탓처럼
 * 읽히지만 실제 원인은 호스트라서, 멀쩡한 토큰을 계속 재발급하며 시간을 버리기 쉽다.
 */
export function resolveApiHost(accessToken?: string): string {
  const explicit = process.env.IG_API_HOST;
  if (explicit) return explicit;
  return accessToken?.startsWith("IGAA") ? "graph.instagram.com" : "graph.facebook.com";
}

/** env에서 IG 설정을 읽는다(호출 시점에 읽어 테스트가 env를 제어할 수 있게 한다). */
export function readInstagramConfig(): InstagramConfig {
  const accessToken = process.env.IG_ACCESS_TOKEN;
  return {
    userId: process.env.IG_USER_ID,
    accessToken,
    apiHost: resolveApiHost(accessToken),
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
interface IgStatusResponse {
  /** IN_PROGRESS | FINISHED | ERROR | EXPIRED | PUBLISHED */
  status_code?: string;
}

/**
 * 컨테이너가 게시 가능(FINISHED)해질 때까지 기다린다.
 *
 * IG는 image_url을 **자기 서버로 가져와 처리**한 뒤에야 게시를 허용한다. 그전에
 * media_publish를 부르면 `400 Media ID is not available`이 떨어진다.
 * 이미지가 이미 IG 쪽에 캐시돼 있으면 생성 직후 바로 FINISHED라 폴링 없이도 우연히
 * 성공한다 — 그래서 **이미지를 새로 바꾼 날에만 터지는 간헐 버그**가 된다. 반드시 기다린다.
 */
async function waitForContainer(
  apiBase: string,
  creationId: string,
  accessToken: string,
  doFetch: FetchLike,
  sleep: (ms: number) => Promise<void>,
): Promise<{ ok: boolean; error?: string }> {
  const url = `${apiBase}/${creationId}?fields=status_code&access_token=${encodeURIComponent(accessToken)}`;

  for (let i = 0; i < CONTAINER_POLL_ATTEMPTS; i += 1) {
    const res = await doFetch(url, { method: "GET" });
    const json = (await res.json().catch(() => ({}))) as IgStatusResponse;
    const status = json.status_code;

    if (status === "FINISHED") return { ok: true };
    if (status === "ERROR" || status === "EXPIRED") {
      return { ok: false, error: `컨테이너 처리 실패(${status}) — 이미지 URL·형식 확인` };
    }
    // IN_PROGRESS(또는 조회 실패)면 잠깐 기다렸다 다시 본다.
    await sleep(CONTAINER_POLL_INTERVAL_MS);
  }

  const waitedSec = (CONTAINER_POLL_ATTEMPTS * CONTAINER_POLL_INTERVAL_MS) / 1000;
  return { ok: false, error: `컨테이너 준비 시간 초과(${waitedSec}s)` };
}

/**
 * 게시된 미디어의 permalink를 조회한다(best-effort — 실패해도 게시 성공은 유지).
 *
 * ⚠️ 미디어는 **user id 하위가 아니라 최상위 노드**다. `/{ig-user-id}/{media-id}`로 부르면
 * `100 Tried accessing nonexisting field`가 난다(미디어 ID를 필드 이름으로 해석). 그래서
 * 게시 경로(`/{ig-user-id}/media`)와 달리 apiBase(host+version)까지만 받는다.
 */
async function fetchPermalink(
  apiBase: string,
  mediaId: string,
  accessToken: string,
  doFetch: FetchLike,
): Promise<string | undefined> {
  try {
    const url = `${apiBase}/${mediaId}?fields=permalink&access_token=${encodeURIComponent(accessToken)}`;
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
 * 1) POST /{ig-user-id}/media           (image_url + caption) → creation_id
 * 2) GET  /{creation-id}?fields=status_code 가 FINISHED 될 때까지 대기
 * 3) POST /{ig-user-id}/media_publish   (creation_id)         → media_id
 * 4) GET  /{media-id}?fields=permalink  (best-effort)
 */
export async function publishToInstagram(
  params: PublishParams,
  deps: InstagramDeps = {},
): Promise<InstagramResult> {
  const config = deps.config ?? readInstagramConfig();
  const doFetch: FetchLike = deps.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
  const sleep =
    deps.sleepImpl ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const imageUrl = params.imageUrl ?? config.imageUrl;

  if (!isInstagramLive(config)) {
    return { posted: false, error: "IG 토큰 미설정 — 복사 폴백" };
  }
  if (!imageUrl) {
    return { posted: false, error: "게시 이미지 URL 미설정 (Instagram은 이미지 필수) — 복사 폴백" };
  }

  // apiBase = 그래프 루트(미디어 조회용), base = 계정 노드(게시용). 둘을 섞으면 permalink가 100으로 깨진다.
  const apiBase = `https://${config.apiHost}/${config.apiVersion}`;
  const base = `${apiBase}/${config.userId}`;
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

    // 2) 컨테이너가 준비될 때까지 대기 — 건너뛰면 400 "Media ID is not available"
    const ready = await waitForContainer(apiBase, createJson.id, token, doFetch, sleep);
    if (!ready.ok) {
      return { posted: false, error: ready.error };
    }

    // 3) 게시
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
    const permalink = await fetchPermalink(apiBase, pubJson.id, token, doFetch);
    return { posted: true, permalink };
  } catch (e) {
    return { posted: false, error: e instanceof Error ? e.message : "IG 게시 오류" };
  }
}
