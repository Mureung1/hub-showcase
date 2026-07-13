/**
 * @file initialFridge.js  (frontend/src/data)
 * @description 초기 냉장고 재고 시드 데이터 — backend 버전과 동일합니다.
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
