/**
 * @file initialFridge.js  (frontend/src/data)
 * @description 초기 냉장고 재고 시드 데이터 — backend 버전과 동일합니다.
 * (설명은 backend/src/data/initialFridge.js 참고)
 */
export const initialFridge = {

  // ── 신선식품 ─────────────────────────────────────────────────────────────

  pork: {
    level: 0,
    purchased: '7/3',
    expiry: 'D-2',
    imminent: true,
  },

  tofu: {
    level: 0,
    purchased: '7/5',
    expiry: 'D-1',
    imminent: true,
  },

  onion: {
    level: 1,          // 반쪽 상태로 시작
    purchased: '7/3',
    expiry: 'D-9',
    imminent: false,
  },

  pa: {
    level: 0,
    purchased: '7/3',
    expiry: 'D-6',
    imminent: false,
  },

  kimchi: {
    level: 0,
    purchased: '7/1',
    expiry: 'D-40',
    imminent: false,
  },

  egg: {
    level: 0,
    purchased: '7/1',
    expiry: 'D-18',
    imminent: false,
  },

  // ── 가공식품 ─────────────────────────────────────────────────────────────

  soy: {
    qtyLabel: '1병',
    expiryLabel: null,
  },

  ramen: {
    qtyLabel: '2개',
    expiryLabel: 'D-90',
  },

  // spam 은 초기 재고에 없음 — 영수증 인식 후 처음 등록됩니다.
};
