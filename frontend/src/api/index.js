import axios from 'axios'

// 데이터 접근 레이어 — 분석·추천 모두 실제 백엔드 호출 (openapi.yaml 스키마 응답)

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

const client = axios.create({ baseURL: API_BASE_URL })

// 네트워크 실패·서버 에러를 한글 메시지로 감싼다 — axios의 영어 기술 메시지가 화면에 노출되지 않게
function toUserError(error, fallbackMessage) {
  if (error.response) {
    // openapi.yaml 공통 에러 형식 { error: { code, message } } — 사용자용 한글 메시지를 그대로 노출
    return new Error(error.response.data?.error?.message || fallbackMessage)
  }
  return new Error('서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.')
}

// POST /api/analysis
export async function createAnalysis(githubId) {
  try {
    const { data } = await client.post('/api/analysis', { githubId })
    return data
  } catch (error) {
    throw toUserError(error, '분석 요청에 실패했어요. 잠시 후 다시 시도해주세요.')
  }
}

// POST /api/recommendations
export async function createRecommendation(githubId, preferences) {
  try {
    const { data } = await client.post('/api/recommendations', { githubId, preferences })
    return data
  } catch (error) {
    throw toUserError(error, '이슈를 찾지 못했어요. 잠시 후 다시 시도해주세요.')
  }
}

// GET /api/recommendations/:id — 새로고침/재진입 시 재조회용
export async function getRecommendation(id) {
  try {
    const { data } = await client.get(`/api/recommendations/${id}`)
    return data
  } catch (error) {
    throw toUserError(error, '추천 결과를 불러오지 못했어요. 잠시 후 다시 시도해주세요.')
  }
}
