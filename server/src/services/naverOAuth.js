import { randomUUID } from "node:crypto";

const AUTHORIZE_URL = "https://nid.naver.com/oauth2.0/authorize";
const TOKEN_URL = "https://nid.naver.com/oauth2.0/token";
const PROFILE_URL = "https://openapi.naver.com/v1/nid/me";
const STATE_TTL_MS = 10 * 60 * 1000;

// CSRF 방지용 state 저장소. 단일 프로세스 로컬 서버라는 전제 하에 메모리에만 둔다 —
// 콜백이 오면 바로 소모하고, 10분 넘게 안 쓰인 값은 만료 처리한다.
const pendingStates = new Map();

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    const err = new Error(
      `${name}가 .env에 설정되어 있지 않습니다. developers.naver.com에서 애플리케이션을 등록해주세요.`
    );
    err.code = "NAVER_OAUTH_NOT_CONFIGURED";
    throw err;
  }
  return value;
}

export function buildAuthorizeUrl() {
  const clientId = requireEnv("NAVER_CLIENT_ID");
  const redirectUri = requireEnv("NAVER_REDIRECT_URI");

  const state = randomUUID();
  pendingStates.set(state, Date.now());

  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  return url.toString();
}

function consumeState(state) {
  const issuedAt = pendingStates.get(state);
  pendingStates.delete(state);
  if (!issuedAt || Date.now() - issuedAt > STATE_TTL_MS) {
    const err = new Error("네이버 로그인 요청이 만료되었거나 유효하지 않습니다. 다시 시도해주세요.");
    err.code = "NAVER_OAUTH_STATE_INVALID";
    throw err;
  }
}

export async function completeNaverLogin(code, state) {
  consumeState(state);

  const clientId = requireEnv("NAVER_CLIENT_ID");
  const clientSecret = requireEnv("NAVER_CLIENT_SECRET");
  const redirectUri = requireEnv("NAVER_REDIRECT_URI");

  const tokenUrl = new URL(TOKEN_URL);
  tokenUrl.searchParams.set("grant_type", "authorization_code");
  tokenUrl.searchParams.set("client_id", clientId);
  tokenUrl.searchParams.set("client_secret", clientSecret);
  tokenUrl.searchParams.set("code", code);
  tokenUrl.searchParams.set("state", state);
  tokenUrl.searchParams.set("redirect_uri", redirectUri);

  const tokenRes = await fetch(tokenUrl.toString());
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    const err = new Error(tokenData.error_description ?? "네이버 로그인 토큰 발급에 실패했습니다.");
    err.code = "NAVER_OAUTH_TOKEN_FAILED";
    throw err;
  }

  const profileRes = await fetch(PROFILE_URL, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const profileData = await profileRes.json();
  if (profileData.resultcode !== "00" || !profileData.response) {
    const err = new Error("네이버 프로필 조회에 실패했습니다.");
    err.code = "NAVER_OAUTH_PROFILE_FAILED";
    throw err;
  }

  const { id: naverId, nickname } = profileData.response;
  return { naverId, nickname };
}

// blogId를 내려주는 공식 API가 없어서, 닉네임/아이디로 실제 blog.naver.com 주소가
// 존재하는지 직접 확인하는 휴리스틱을 쓴다. "존재하지 않는 블로그입니다" 문구는
// 실제 네이버 에러 페이지 마크업을 검증하지 않고 정한 추정치라 오탐 가능성이 있다 —
// 그래서 항상 사용자 확인("맞나요?") 단계를 거치게 하고, 최종 신뢰 소스로 쓰지 않는다.
async function blogExists(candidate) {
  if (!candidate) return false;
  try {
    const res = await fetch(`https://blog.naver.com/${encodeURIComponent(candidate)}`, { redirect: "follow" });
    if (!res.ok) return false;
    const text = await res.text();
    return !text.includes("존재하지 않는 블로그");
  } catch {
    return false;
  }
}

export async function guessBlogId({ naverId, nickname }) {
  const candidates = [...new Set([nickname, naverId].filter(Boolean))];
  for (const candidate of candidates) {
    if (await blogExists(candidate)) {
      return { blogIdCandidate: candidate, candidateExists: true };
    }
  }
  return { blogIdCandidate: candidates[0] ?? null, candidateExists: false };
}
