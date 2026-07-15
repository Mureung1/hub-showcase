import type { DisposalApiClient, GovDisposalItem } from '../types/govDisposalApi'

// 공공데이터 API 키가 준비되지 않았거나 로컬 개발/테스트 중 실제 호출을 피하고 싶을 때 대체할 mock 클라이언트
const MOCK_DISPOSAL_METHODS: Record<string, string> = {
  '우유팩': '재활용폐기물',
  '플라스틱 음료병': '내용물을 비우고 물로 헹군 후 라벨을 제거하여 배출',
  '건전지': '전용 수거함에 배출',
  '종이팩': '내용물을 비우고 물로 헹군 후 압착하여 배출',
}

async function fetchDisposalMethod(itemNm: string): Promise<GovDisposalItem[]> {
  const dschgMthd = MOCK_DISPOSAL_METHODS[itemNm]
  return dschgMthd ? [{ itemNm, dschgMthd }] : []
}

export const mockGovDisposalApiClient: DisposalApiClient = { fetchDisposalMethod }
