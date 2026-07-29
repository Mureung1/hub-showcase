// 임시 목데이터 — 빵종류/가격대/혼잡시간대. 실제 수집 항목이 아니라서(list.csv에 없음) 리스트 필터와
// "한산해요" 말풍선을 지금 바로 시연하기 위해 붙였다. 실데이터(카테고리 태깅, 몰리는 시간 조사)가
// 채워지면 이 파일은 지우고 서버 응답 필드로 바로 교체하면 된다.
import { BREAD_CATEGORIES } from './breadCategories.js';

export const PRICE_LABELS = { 1: '저가', 2: '중가', 3: '고가' };

// 이름 기준으로 실제 대표메뉴와 그럴듯하게 맞춘 값(알고 있는 곳들만). 나머지는 아래 fallback으로 생성.
const BY_NAME = {
  뮤제: { category: ['크루아상', '스콘'], priceTier: 3, busyHours: [11, 13] },
  관저당: { category: ['식빵'], priceTier: 1, busyHours: [12, 13] },
  마들렌과자점: { category: ['스콘'], priceTier: 2, busyHours: [14, 15] },
  콜마르브레드: { category: ['바게트', '식빵'], priceTier: 2, busyHours: [9, 10] },
  손수베이커리: { category: ['식빵'], priceTier: 1, busyHours: [17, 18] },
  하레하레: { category: ['스콘'], priceTier: 2, busyHours: [15, 17] },
  성심당: { category: ['바게트', '크루아상'], priceTier: 2, busyHours: [11, 14] },
  정인구팥빵: { category: ['단팥빵'], priceTier: 1, busyHours: [16, 18] },
  캘리포니아베이커리: { category: ['크루아상'], priceTier: 2, busyHours: [10, 11] },
  굿베이커리: { category: ['식빵'], priceTier: 1, busyHours: [13, 14] },
  정동문화사: { category: ['스콘'], priceTier: 2, busyHours: [14, 16] },
  팡파레과자점: { category: ['스콘'], priceTier: 2, busyHours: [12, 13] },
  슬로우브레드: { category: ['바게트'], priceTier: 3, busyHours: [9, 11] },
  한스브레드: { category: ['크루아상', '단팥빵'], priceTier: 2, busyHours: [9, 10] },
  길티쿠키: { category: ['스콘'], priceTier: 2, busyHours: [12, 14] },
  다다제과점: { category: ['스콘'], priceTier: 3, busyHours: [11, 12] },
  파이가든: { category: ['스콘'], priceTier: 3, busyHours: [12, 13] },
};

// 위 목록에 없는 빵집(앞으로 데이터가 늘어날 때)도 항상 같은 값이 나오도록 id로 결정적 생성.
// hasCoffee는 빵투어 테마(tourThemes.js) "커피와 함께" 필터용 — 실제 커피 판매 여부 데이터가
// 없어서 id 기반으로 결정적으로 반반 나눈다.
function fallbackExtras(bakery) {
  const seed = bakery.id ?? 0;
  return {
    category: [BREAD_CATEGORIES[seed % BREAD_CATEGORIES.length]],
    priceTier: (seed % 3) + 1,
    busyHours: [10 + (seed % 8), 11 + (seed % 8)],
    hasCoffee: seed % 2 === 0,
  };
}

export function withMockExtras(bakery) {
  // BY_NAME 항목이 있어도 hasCoffee처럼 BY_NAME에 없는 필드는 fallback 값을 그대로 쓰도록 병합한다
  // (예전엔 BY_NAME이 있으면 fallback을 통째로 무시해서, BY_NAME에 없는 새 필드는 항상 undefined였음).
  const extra = { ...fallbackExtras(bakery), ...(BY_NAME[bakery.name] || {}) };
  return { ...bakery, ...extra };
}
