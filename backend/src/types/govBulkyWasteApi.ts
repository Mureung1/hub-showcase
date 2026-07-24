// 환경부_전국대형폐기물수거수수료정보표준데이터(tn_pubr_public_lar_was_fee_api) 원본 응답 타입.
// larWasSpcfct(규격)는 실측 결과 거의 항상 "null" 문자열이라 크기 구분에 쓸 수 없음 — 같은 larWasNm이
// 크기별로 다른 fee를 가진 여러 행으로 나타나도 어느 행이 어느 크기인지 구분 불가능하다.
export interface GovBulkyWasteRow {
  ctpvNm: string
  sggNm: string
  larWasNm: string // 대형폐기물명
  larWasSeNm: string // 대형폐기물구분명(가전제품류/가구류 등)
  larWasSpcfct: string // 대형폐기물규격 — 실측상 사실상 항상 "null" 문자열
  paidFreeYn: string // 유료/무료
  fee: string // 원본이 문자열 숫자로 내려옴 (예: "8000")
  mngInstNm: string // 관리기관명 — 실측상 대부분 "null" 문자열
  crtrYmd: string // 데이터기준일자
  insttCode: string
  insttNm: string
}
