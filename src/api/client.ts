import type { MatchRequest, MatchResponse, Subsidy } from '@hub/shared'
import {
  getDisplaySubsidies,
  MOCK_SUBSIDIES,
  sortSubsidies,
} from '../data/mockSubsidies'

/**화면과 실제 데이터 소스(서버 vs mock) 사이의 경계를 두는 클래스 
 * 서버 준비 전까지는 mock 데이터 사용
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

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    throw new ApiError(res.status, `${init?.method ?? 'GET'} ${url} → ${res.status}`)
  }
  return res.json() as Promise<T>
}

/** GET /api/subsidies — 서버 연결 실패 시 mock 목록으로 대체 */
export async function getSubsidies(): Promise<Subsidy[]> {
  try {
    const data = await fetchJson<{ items: Subsidy[] }>('/api/subsidies')
    return data.items
  } catch {
    return MOCK_SUBSIDIES
  }
}

/**
 * GET /api/subsidies/:id — 실패(404 포함) 시 mock에서 조회.
 * 서버 샘플 데이터(2건)가 아직 mock(8건)보다 적어서, 404도 "신뢰할 수 없는 응답"으로
 * 보고 mock으로 대체한다. Supabase 연동 후 서버 데이터가 완전해지면 재검토가 필요하다.
 */
export async function getSubsidy(id: string): Promise<Subsidy | undefined> {
  try {
    return await fetchJson<Subsidy>(`/api/subsidies/${encodeURIComponent(id)}`)
  } catch {
    return MOCK_SUBSIDIES.find((item) => item.id === id)
  }
}

/**
 * POST /api/match — 서버에 아직 구현되지 않은 엔드포인트(수요일 이슈 #4 예정).
 * 요청이 실패하면 온보딩 프로필로 로컬 mock 매칭 결과를 계산해
 * 동일한 응답 형태(`MatchResponse`)로 반환한다.
 */
export async function submitProfile(req: MatchRequest): Promise<MatchResponse> {
  const sort = req.sort ?? 'match'
  try {
    return await fetchJson<MatchResponse>('/api/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
  } catch {
    const items = sortSubsidies(getDisplaySubsidies(req.profile), sort)
    return { items, total: items.length, sort }
  }
}
