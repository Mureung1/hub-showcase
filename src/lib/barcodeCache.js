// FR-7 — 바코드로 스캔한 제품의 과거 OCR 인식 결과를 기기별로 쌓아두는 캐시. 실시간 정부 바코드
// DB는 2018년 이후 갱신이 끊겨 못 쓰므로(조사 확인됨), "한 번 OCR로 읽은 제품은 다음부턴 바코드만
// 찍어도 즉시 나오게" 하는 자체 축적형 캐시로 범위를 좁혔다. 계정이 아니라 기기별 저장 —
// foodCategory.js/cardSettings.js와 같은 이유(화면 편의 기능이지 계정 데이터가 아님).
import { get, set } from './storage.js'

function storageKey(ean) {
  return `barcode:${ean}`
}

// product: { items: [{name, brand, nutrients, source}], total } — resolveLabelScan의 반환 모양과 동일.
export function getCachedProduct(ean) {
  if (!ean) return null
  return get(storageKey(ean), null)
}

export function cacheProduct(ean, product) {
  if (!ean || !product) return
  set(storageKey(ean), product)
}
