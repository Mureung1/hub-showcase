import type { VisionApiClient, VisionImageInput } from '../types/visionApi'

// Gemini API 키가 준비되지 않았거나 로컬 개발/테스트 중 실제 호출을 피하고 싶을 때 대체할 mock 클라이언트
// 실제 이미지 내용과 무관하게 objectNormalizer가 인식하는 라벨을 고정 반환한다
const MOCK_LABEL = 'water bottle'

async function recognizeObject(_image: VisionImageInput): Promise<string | null> {
  return MOCK_LABEL
}

export const mockVisionApiClient: VisionApiClient = { recognizeObject }
