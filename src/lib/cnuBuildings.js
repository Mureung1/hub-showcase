// 충남대 학식 건물(식당) 목록의 단일 소스 — 지도 탭의 식당 선택 세그먼트가 그대로 쓴다.
// server/univMealAdapters/cnu.js의 CNU_BUILDINGS와 key가 정확히 일치해야 한다(그쪽이 실제
// 응답의 cafeterias 키를 만든다) — 서버 파일은 클라이언트에서 import할 수 없어 값을 여기 복제해
// 두고, 두 파일 상단 주석으로 서로를 가리키게 해 드리프트를 눈에 띄게 한다.
import { get, set } from './storage.js'

export const CNU_BUILDINGS = [
  { key: 'cnu1', label: '1학' },
  { key: 'cnu2', label: '2학' },
  { key: 'cnu3', label: '3학' },
  { key: 'cnu4', label: '4학' },
  { key: 'cnuLife', label: '생과대' },
]

export const DEFAULT_CNU_BUILDING = 'cnu1'

// 제1학생회관은 이 시스템에 실제 식단 데이터가 없어(실측) 사이트 자체도 별도 안내 페이지로 보낸다.
export const CNU1_EXTERNAL_LINK = {
  url: 'https://cnuit.cnu.ac.kr/checkMenu.jsp?p0=B124va6F37RRI8qp',
  note: '제1학생회관은 별도 운영 안내 페이지에서 확인할 수 있어요.',
}

export function getCnuBuilding(key) {
  return CNU_BUILDINGS.find((b) => b.key === key) ?? CNU_BUILDINGS[0]
}

// 선택한 식당은 기기(localStorage)에 저장 — cardSettings.js/foodCategory.js와 같은 이유로 계정이
// 아니라 화면 설정이다(재방문 시 마지막 선택 식당 유지, 기본값 1학).
const STORAGE_KEY = 'mapSettings:cnuBuilding'

export function getSelectedCnuBuilding() {
  const saved = get(STORAGE_KEY, null)
  return typeof saved === 'string' && CNU_BUILDINGS.some((b) => b.key === saved) ? saved : DEFAULT_CNU_BUILDING
}

export function setSelectedCnuBuilding(key) {
  set(STORAGE_KEY, getCnuBuilding(key).key)
}
