// 백엔드 인증 API(POST /api/auth/*, GET /api/users/me)와 소셜 로그인 리다이렉트를
// 다루는 모듈. 화면 컴포넌트는 이 파일의 함수만 부르고, fetch나 OAuth URL 조립은
// 여기에만 둔다.

const AUTHORIZE_URL = {
  google: 'https://accounts.google.com/o/oauth2/v2/auth',
  kakao: 'https://kauth.kakao.com/oauth/authorize',
}

const CLIENT_ID = {
  google: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  kakao: import.meta.env.VITE_KAKAO_CLIENT_ID,
}

const REDIRECT_URI = import.meta.env.VITE_OAUTH_REDIRECT_URI

// 구글/카카오로 떠날 때 어느 쪽으로 갔는지 기억해둔다. 돌아왔을 때 인가 코드를
// 어느 엔드포인트로 보내야 할지 알아야 하기 때문이다.
const PROVIDER_KEY = 'oauth:pending-provider'

export function startOAuthLogin(provider) {
  const clientId = CLIENT_ID[provider]
  if (!clientId) {
    throw new Error(`${provider} 클라이언트 ID가 없습니다. bungae-moim/.env를 확인하세요.`)
  }

  sessionStorage.setItem(PROVIDER_KEY, provider)

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
  })
  if (provider === 'google') {
    params.set('scope', 'openid email profile')
  }

  window.location.assign(`${AUTHORIZE_URL[provider]}?${params}`)
}

// 소셜 로그인에서 돌아온 직후라면 주소창의 ?code=... 를 꺼내 반환하고, 주소창은
// 깨끗하게 정리한다(같은 코드를 새로고침 때 다시 쓰지 않도록). 아니면 null.
export function takePendingOAuthCode() {
  const code = new URLSearchParams(window.location.search).get('code')
  if (!code) return null

  const provider = sessionStorage.getItem(PROVIDER_KEY)
  sessionStorage.removeItem(PROVIDER_KEY)
  window.history.replaceState({}, '', window.location.pathname)

  return provider ? { provider, code } : null
}

async function request(path, options) {
  const res = await fetch(path, { credentials: 'same-origin', ...options })
  const body = await res.json().catch(() => null)

  if (!res.ok) {
    const error = new Error(body?.error?.message ?? '요청에 실패했어요. 잠시 후 다시 시도해 주세요.')
    error.code = body?.error?.code
    throw error
  }

  return body.data
}

export function exchangeOAuthCode(provider, code) {
  return request(`/api/auth/${provider}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
}

// 로그인 상태면 사용자 정보를, 아니면 UNAUTHENTICATED 에러를 던진다.
export function fetchMe() {
  return request('/api/users/me')
}

export function requestLogout() {
  return request('/api/auth/logout', { method: 'POST' })
}
