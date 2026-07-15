import recommendationsMock from '../mocks/recommendations.json'
import recommendationDetailMock from '../mocks/recommendationDetail.json'

// 데이터 접근 레이어 — 분석은 실제 백엔드, 추천은 아직 mock JSON을 지연과 함께 반환한다.
// W3에서 이 파일 내부만 실제 백엔드 호출로 교체하면 화면 코드는 그대로 동작한다.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

const RECOMMENDATION_DELAY_MS = 2000
const FETCH_DELAY_MS = 300

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// POST /api/analysis — 실제 백엔드 호출 (openapi.yaml Analysis 스키마 응답)
export async function createAnalysis(githubId) {
  let response
  let body
  try {
    response = await fetch(`${API_BASE_URL}/api/analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ githubId }),
    })
    body = await response.json()
  } catch {
    // 네트워크 실패·JSON 아닌 응답 — fetch의 영어 기술 메시지가 화면에 노출되지 않게 한글로 감싼다
    throw new Error('서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.')
  }
  if (!response.ok) {
    // openapi.yaml 공통 에러 형식 { error: { code, message } } — 사용자용 한글 메시지를 그대로 노출
    throw new Error(body?.error?.message || '분석 요청에 실패했어요. 잠시 후 다시 시도해주세요.')
  }
  return body
}

// POST /api/recommendations
export async function createRecommendation(githubId, preferences) {
  await delay(RECOMMENDATION_DELAY_MS)
  return { ...recommendationsMock, githubId, preferences }
}

// GET /api/recommendations/:id — 새로고침/재진입 시 재조회용 (mock은 id와 무관하게 동일 응답)
export async function getRecommendation() {
  await delay(FETCH_DELAY_MS)
  return recommendationDetailMock
}
