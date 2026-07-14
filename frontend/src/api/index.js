import analysisMock from '../mocks/analysis.json'
import analysisEmptyMock from '../mocks/analysis-empty.json'
import recommendationsMock from '../mocks/recommendations.json'
import recommendationDetailMock from '../mocks/recommendationDetail.json'

// 데이터 접근 레이어 — 지금은 mock JSON을 지연과 함께 반환한다.
// W3에서 이 파일 내부만 실제 백엔드 호출(axios 등)로 교체하면 화면 코드는 그대로 동작한다.

const ANALYSIS_DELAY_MS = 2500
const RECOMMENDATION_DELAY_MS = 2000
const FETCH_DELAY_MS = 300

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// POST /api/analysis — 'newbie-dev' 입력 시 활동 없는 사용자(빈 분석, 200)를 시뮬레이션
export async function createAnalysis(githubId) {
  await delay(ANALYSIS_DELAY_MS)
  if (githubId === analysisEmptyMock.githubId) {
    return analysisEmptyMock
  }
  return { ...analysisMock, githubId }
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
