/**
 * @file initialFridge.js
 * @description 초기 냉장고 재고 시드 데이터.
 *
 * ## 역할
 * 앱을 처음 실행하거나 store 를 리셋할 때 사용하는 초기 재고 상태입니다.
 * "지금 냉장고에 얼마나 남아 있는가" — 즉 시점에 따라 변하는 값만 담습니다.
 *
 * ## 마스터 정보와의 분리
 * emoji·name·role·tip·defaultUnitLabels 같은 재료 고유 속성은
 * ingredients.js 에서 관리합니다. store.js 의 getFridge() 가
 * 두 소스를 합산해 API 응답으로 내려줍니다.
 *
 * ## 필드 설명
 * - level      : defaultUnitLabels 배열 안에서의 현재 인덱스.
 *                마지막 인덱스(= '소진')에 도달하면 재고 없음.
 * - purchased  : 구매일 표시 문자열 ('M/D' 형식, 화면 표시 전용)
 * - expiry     : 유통기한 D-day 문자열 ('D-N' 또는 'D+N')
 * - imminent   : expiry 가 D-2 이하일 때 true → 화면에 빨간 뱃지 표시
 *
 * ## 가공식품(processed)
 * levels 배열 대신 qtyLabel(문자열) + expiryLabel(문자열 | null) 을 사용합니다.
 * 재고량 추적이 없으므로 level 필드는 없습니다.
 */

/** @type {Record<string, import('./fridgeItem').FreshStock | import('./fridgeItem').ProcessedStock>} */
export const initialFridge = {

  // ── 신선식품 (level 로 잔량 추적) ────────────────────────────────────────

  pork: {
    level: 0,          // '300g' 상태
    purchased: '7/3',
    expiry: 'D-2',
    imminent: true,
  },

  tofu: {
    level: 0,          // '반모' 상태 (defaultUnitLabels: ['1모','반모','소진'] 중 0번)
    purchased: '7/5',
    expiry: 'D-1',
    imminent: true,
  },

  onion: {
    level: 1,          // '반쪽' 상태 (defaultUnitLabels: ['1개','반쪽','1/4쪽','소진'] 중 1번)
    purchased: '7/3',
    expiry: 'D-9',
    imminent: false,
  },

  pa: {
    level: 0,          // '한단' 상태
    purchased: '7/3',
    expiry: 'D-6',
    imminent: false,
  },

  kimchi: {
    level: 0,          // '1/2통' 상태
    purchased: '7/1',
    expiry: 'D-40',
    imminent: false,
  },

  egg: {
    level: 0,          // '6알' 상태
    purchased: '7/1',
    expiry: 'D-18',
    imminent: false,
  },

  // ── 가공식품 (level 추적 없음, qtyLabel 문자열로 표시) ────────────────

  soy: {
    qtyLabel: '1병',
    expiryLabel: null, // 유통기한 미입력
  },

  ramen: {
    qtyLabel: '2개',
    expiryLabel: 'D-90',
  },

  // spam 은 초기 재고에 없음 — 영수증 인식 후 처음 등록됩니다.
};
