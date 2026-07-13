/**
 * @file initialFridge.js
 * @description 초기 냉장고 재고 시드 데이터.
 *
 * ## 역할
 * 앱을 처음 실행하거나 store 를 리셋할 때 사용하는 초기 재고 상태입니다.
 * "지금 냉장고에 얼마나 남아 있는가" — 즉 시점에 따라 변하는 값만 담습니다.
 *
 * ## 다중 유통기한 지원 (2026-07-13 업데이트)
 * 동일한 식자재를 여러 번 구매할 수 있도록 `items` 배열 안에 구매 내역을 저장합니다.
 *
 * ## 필드 설명 (items 배열 내 요소)
 * - 신선식품 (fresh)
 *   - qtyAmount : 수치 (예: 300, 0.5)
 *   - qtyUnit   : 단위 (예: 'g', '모', '개')
 * - 가공식품 (processed)
 *   - qtyLabel  : 자유 입력 문자열 (예: '1병')
 * - 공통
 *   - purchased : 구매일 ('M/D' 형식)
 *   - expiry    : 유통기한 ('D-N' 또는 null)
 *   - imminent  : 유통기한 임박 여부 (true/false)
 */

export const initialFridge = {

  // ── 신선식품 ────────────────────────────────────────

  pork: {
    items: [
      { qtyAmount: 300, qtyUnit: 'g', purchased: '7/3', expiry: 'D-2', imminent: true }
    ]
  },

  tofu: {
    items: [
      { qtyAmount: 0.5, qtyUnit: '모', purchased: '7/5', expiry: 'D-1', imminent: true }
    ]
  },

  onion: {
    items: [
      { qtyAmount: 0.5, qtyUnit: '개', purchased: '7/3', expiry: 'D-9', imminent: false }
    ]
  },

  pa: {
    items: [
      { qtyAmount: 1, qtyUnit: '단', purchased: '7/3', expiry: 'D-6', imminent: false }
    ]
  },

  kimchi: {
    items: [
      { qtyAmount: 0.5, qtyUnit: '통', purchased: '7/1', expiry: 'D-40', imminent: false }
    ]
  },

  egg: {
    items: [
      { qtyAmount: 6, qtyUnit: '알', purchased: '7/1', expiry: 'D-18', imminent: false }
    ]
  },

  // ── 가공식품 ────────────────────────────────

  soy: {
    items: [
      { qtyLabel: '1병', purchased: '7/1', expiry: null, imminent: false }
    ]
  },

  ramen: {
    items: [
      { qtyLabel: '2개', purchased: '7/1', expiry: 'D-90', imminent: false }
    ]
  },

  // spam 은 초기 재고에 없음
};
