/**
 * 쿠폰 혜택 상한 — FE·BE가 같은 값·같은 판정을 쓰기 위한 단일 출처.
 *
 * 예전엔 상한(20% / 3,000원)과 추출 정규식이 서버 agent/guardrails.ts와 웹 App.tsx에
 * 따로 적혀 있었다. 값이 갈리면 화면은 "괜찮다"는데 서버가 거부하는(또는 그 반대) 상황이
 * 생기고, MOCK_MODE에선 서버가 아예 없어 상한이 무방비가 된다.
 * 판정 로직을 여기 한 곳에 두고 서버 가드레일·웹 안내·MOCK 거부가 모두 이걸 import 한다.
 *
 * 여기 담는 것은 "숫자 상한"뿐이다. 금칙어·LMS byte·창작 상호처럼 서버만 아는 규칙은
 * 계속 agent/guardrails.ts에 남는다 (프론트에 옮길 이유도, 옮겨서 얻을 것도 없다).
 */

/** 정률 쿠폰 상한(%). */
export const MAX_DISCOUNT_PCT = 20;

/**
 * 정액 쿠폰 상한(원). 정률 20%와 눈높이를 맞춘 값이다 —
 * 카페 객단가를 7,000~10,000원(세트 포함)으로 보면 20%가 1,400~2,000원이고,
 * 세트 상품에 여유를 줘 3,000원으로 뒀다. 상향하려면 이 값만 바꾸면 된다.
 * (stores에 객단가 컬럼이 없어 매장별 계산은 못 한다 — 후속: 객단가 확보 시 비율로 전환)
 */
export const MAX_DISCOUNT_WON = 3000;

/**
 * 텍스트에서 최대 할인율(%)을 추출. 없으면 0.
 *
 * 뒤에 "할인"이 붙었는지 안 따진다 — "30% 세일"처럼 다르게 쓴 위반도 잡아야 한다.
 * FE promo.ts의 RATE는 반대로 "N% 할인"만 본다: 저쪽은 숫자를 고치는 쪽이라 넓게 잡으면
 * "100% 아라비카"를 할인율로 바꿔버린다. 강제는 넓게, 편집은 좁게 — 목적이 반대다.
 */
export function maxDiscountPct(text: string): number {
  const nums = [...text.matchAll(/(\d+)\s*%/g)].map((m) => Number(m[1]));
  return nums.length > 0 ? Math.max(...nums) : 0;
}

/**
 * 텍스트에서 최대 정액 할인액(원)을 추출. 없으면 0.
 *
 * "할인"·"쿠폰"이 뒤따르는 금액만 잡는다 — "5,000원 이상 주문 시"처럼 조건으로 쓴 금액을
 * 할인액으로 오인하면 멀쩡한 제안이 위반으로 걸려 재생성 루프에 빠진다. 금액은 정률과 달리
 * 조건으로 쓰이는 일이 흔해서, 강제 쪽도 좁게 잡는 게 맞다.
 * FE promo.ts의 AMOUNT와 같은 정규식이다(양쪽이 같은 값을 읽어야 안내와 강제가 어긋나지 않음).
 */
export function maxDiscountWon(text: string): number {
  const nums = [...text.matchAll(/([\d,]+)\s*원(?=\s*(?:할인|쿠폰))/g)].map((m) =>
    Number(m[1].replace(/,/g, "")),
  );
  return nums.length > 0 ? Math.max(...nums) : 0;
}

/**
 * 상한 위반 목록을 돌려준다 (통과면 빈 배열).
 * 문자열 형식은 서버가 400 본문에 그대로 싣는 값이라, MOCK도 같은 문장을 내야
 * 사장님이 보는 경고가 실서버와 달라지지 않는다.
 */
export function promoLimitViolations(text: string): string[] {
  const violations: string[] = [];

  const pct = maxDiscountPct(text);
  if (pct > MAX_DISCOUNT_PCT) {
    violations.push(`할인율 ${pct}% (상한 ${MAX_DISCOUNT_PCT}%)`);
  }

  const won = maxDiscountWon(text);
  if (won > MAX_DISCOUNT_WON) {
    violations.push(
      `할인액 ${won.toLocaleString("ko-KR")}원 (상한 ${MAX_DISCOUNT_WON.toLocaleString("ko-KR")}원)`,
    );
  }

  return violations;
}
