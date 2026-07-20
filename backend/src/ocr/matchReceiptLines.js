// 영수증에는 상품명 줄 사이사이에 매장 정보·날짜·합계·카드 승인 내역 같은 잡음 줄이 섞여 있다.
// 재료 마스터와 매칭을 시도하기 전에 이런 줄부터 걸러내야 오탐(誤探)이 줄어든다.
const NOISE_PATTERNS = [
  /^[\d,.\s원₩%*-]+$/, // 숫자·기호로만 이루어진 줄(가격/수량/구분선)
  /\d{2,4}[.\-/]\d{1,2}[.\-/]\d{1,2}/, // 날짜
  /\d{2,3}-\d{3,4}-\d{4}/, // 전화번호
  /(합계|소계|과세|면세|부가세|받은금액|거스름|카드|승인|포인트|적립|사업자|대표자|전화|영수증|감사합니다|이용해|매장|POS|TEL|No\.|고객용|주문번호|테이크아웃|매출|할인|쿠폰)/,
];

function isNoiseLine(line) {
  const trimmed = line.trim();
  if (trimmed.length < 2) return true;
  return NOISE_PATTERNS.some((re) => re.test(trimmed));
}

// 줄 끝에 붙은 가격/수량 표기("두부 1,500", "계란 1판 4900원")를 잘라내 재료명만 남긴다 —
// OCR이 상품명을 줄여 찍는 경우가 있어 "재료명이 줄을 포함"하는 방향도 함께 봐야 하기 때문.
function stripTrailingAmount(line) {
  return line.replace(/[\d,.\s]*원?\s*$/, '').trim();
}

// OCR 줄 목록을 재료 마스터와 대조해 confirmReceipt가 그대로 쓸 수 있는 영수증 항목으로 변환한다.
// view를 넘기면(냉장고에 이미 있는지) isNew를 실제로 판단하고, 없으면(폴백 등) 항상 true로 둔다.
export function matchReceiptLines(lines, ingredientMap, view = {}) {
  const masters = Object.values(ingredientMap);
  const items = [];
  const matchedIds = new Set();
  const unmatchedRawTexts = [];

  for (const rawLine of lines) {
    if (isNoiseLine(rawLine)) continue;
    const trimmed = rawLine.trim();
    const stem = stripTrailingAmount(trimmed);

    const master = masters.find((m) =>
      !matchedIds.has(m.id) && (trimmed.includes(m.name) || (stem.length >= 2 && m.name.includes(stem)))
    );

    if (master) {
      matchedIds.add(master.id);
      items.push({
        rawText: trimmed,
        matchedIngredientId: master.id,
        quantityLabel: master.defaultUnitLabels?.[0] || '1개',
        category: master.category,
        matched: true,
        isNew: !view[master.id],
      });
    } else if (unmatchedRawTexts.length < 5) {
      // 재료로 매칭되지 않은 줄도 몇 개까지는 보여줘서 사용자가 "이건 놓쳤구나"를 알 수 있게 한다.
      // 다만 잡음 필터를 통과한 모든 줄을 다 보여주면 목록이 지저분해지므로 5개로 캡을 둔다.
      unmatchedRawTexts.push(trimmed);
    }
  }

  unmatchedRawTexts.forEach((rawText) => {
    items.push({ rawText, matchedIngredientId: null, quantityLabel: null, category: null, matched: false });
  });

  return items;
}
