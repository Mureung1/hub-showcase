// 시/도, 구/군, 동/읍/면 등 한국 행정구역명을 영어(로마자 표기)로 변환하는 클라이언트의 공통 인터페이스.
// 품목명 번역(Item.nameEn)과 달리 "의미 번역"이 아니라 "표준 로마자 표기"가 목표 — 잘못된 표기가
// 실제 지명과 다르면(예: "강릉" → "Gangreung") 눈에 띄게 틀려 보이므로, 규칙 기반 로마자 변환 라이브러리
// 대신 이미 검증된 실제 지명을 알고 있을 가능성이 높은 LLM(Gemini)을 재사용한다.
export interface RegionNameTranslation {
  name: string
  nameEn: string
}

export interface RegionNameClient {
  translateNames(names: string[]): Promise<RegionNameTranslation[]>
}
