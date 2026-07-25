import type { MatchRequest, MatchResponse, OnboardingProfile, Subsidy } from '@hub/shared'
import {
  getDisplaySubsidies,
  MOCK_SUBSIDIES,
  sortSubsidies,
} from '../data/mockSubsidies'

/**
 * 화면과 실제 데이터 소스(서버 vs mock) 사이의 경계를 두는 레이어.
 * 서버 요청이 실패하면(네트워크 오류, 5xx 등) mock 데이터로 자동 전환된다.
 */

/** 서버 응답이 실패(4xx/5xx)했을 때 상태 코드를 함께 담아 던지는 에러 */
export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * 배포 환경의 API 서버 주소. 로컬 개발(Vite `/api` 프록시)이나 client·server를 같은 호스트에서
 * 서빙하는 경우엔 빈 문자열(상대 경로)로 둔다 — GitHub Pages처럼 client만 별도로 배포된 경우에만
 * 실제 서버 URL을 빌드 시점에 주입한다(#56).
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`
  const res = await fetch(url, init)
  if (!res.ok) {
    throw new ApiError(res.status, `${init?.method ?? 'GET'} ${url} → ${res.status}`)
  }
  return res.json() as Promise<T>
}

/**
 * GET /api/subsidies/:id — 단건 조회. 실패(네트워크 오류, 404, 5xx 등) 시 mock에서 찾아 대체한다.
 * 화면은 항상 무언가를 보여줄 수 있어야 하므로, 서버 응답을 신뢰할 수 없는 모든 경우를 동일하게 처리한다.
 *
 * `profile`을 넘기면 서버가 `POST /api/match`와 동일한 공식으로 매칭도를 재계산해서 반환한다
 * (이슈 #61) — 리스트 캐시에서 값을 못 찾았을 때(직접 URL 접속·새로고침)만 호출부에서 넘기는
 * fallback 경로.
 */
export async function getSubsidy(
  id: string,
  profile?: Pick<OnboardingProfile, 'region' | 'industry'>,
): Promise<Subsidy | undefined> {
  const query = profile
    ? `?${new URLSearchParams({ region: profile.region, industry: profile.industry })}`
    : ''
  try {
    return await fetchJson<Subsidy>(`/api/subsidies/${encodeURIComponent(id)}${query}`)
  } catch (err) {
    console.warn('[api] getSubsidy 실패, mock으로 대체:', err)
    return MOCK_SUBSIDIES.find((item) => item.id === id)
  }
}

/**
 * POST /api/match — 온보딩 프로필 + 정렬 기준으로 매칭 결과를 조회한다.
 * 요청이 실패하면 로컬 mock 매칭 결과를 동일한 응답 형태(`MatchResponse`)로 계산해 대체한다.
 */
export async function submitProfile(req: MatchRequest): Promise<MatchResponse> {
  const sort = req.sort ?? 'match'
  try {
    return await fetchJson<MatchResponse>('/api/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
  } catch (err) {
    console.warn('[api] submitProfile 실패, mock으로 대체:', err)
    const items = sortSubsidies(getDisplaySubsidies(req.profile), sort)
    // mock은 8건뿐이라 페이지네이션(#48) 없이 한 페이지로 전부 반환
    return { items, total: items.length, sort, page: 1, limit: items.length, hasMore: false }
  }
}
