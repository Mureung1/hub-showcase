/**
 * 쿠폰 프로모션 문구 편집 유틸. (QW-4)
 *
 * promo는 자유 문구라 혜택 형태가 두 가지로 들어온다 —
 *   정률: "픽업 주문 10% 할인 (오늘 하루)"
 *   정액: "따뜻한 세트 2,000원 할인 (단골 전용)"
 * 예전엔 % 전용 정규식 하나로 둘을 같이 다뤄서, %가 없는 정액 쿠폰의 원문이 통째로
 * "0% 할인"으로 덮어써졌다(문구는 2,000원인데 쿠폰은 0%, editedPromo·SNS 캡션까지 그 값).
 * 이제 형태를 PromoEdit으로 갈라, 화면이 % 입력·원 입력·편집불가 셋 중 하나만 띄운다.
 *
 * 상한(정률 ≤20% · 정액 ≤3,000원) 최종 강제는 서버 agent/guardrails.ts 몫이고
 * 여기서는 표시·편집·안내만 한다. 정규식은 서버 maxDiscountPct·maxDiscountWon과
 * 같은 것을 쓴다 — 양쪽이 같은 값을 읽어야 화면 안내와 서버 거부가 어긋나지 않는다.
 * (서버 코드라 import 못 해 재구현. 서버를 고치면 이쪽도 같이 고쳐야 한다)
 */

/** 쿠폰 편집 상태. none = 혜택 형태를 못 읽어 편집 대상이 아님(원문 보존). */
export type PromoEdit =
  | { kind: "rate"; pct: number }
  | { kind: "amount"; won: number }
  | { kind: "none" };

// g 플래그를 붙이지 않는다 — test()·replace()에 같은 객체를 재사용하므로 lastIndex가
// 남으면 호출 순서에 따라 결과가 달라진다.
const RATE = /(\d+)\s*%/;
// "할인"·"쿠폰"이 뒤따르는 금액만 잡는다 — "5,000원 이상 주문 시"처럼 조건으로 쓴 금액을
// 할인액으로 오인하면 사장님이 안 건드린 숫자가 편집으로 바뀌어버린다.
const AMOUNT = /([\d,]+)\s*원(?=\s*(?:할인|쿠폰))/;

/** 1000 → "1,000" (쿠폰 문구용 천단위 구분). */
function formatWon(won: number): string {
  return won.toLocaleString("ko-KR");
}

/**
 * promo 문구에서 혜택 형태와 값을 읽는다.
 * %가 있으면 정률이 우선이다 — "픽업 10% 할인 (5,000원 이상)"처럼 둘이 같이 나오면
 * 사장님이 조절할 대상은 할인율이다.
 */
export function parsePromo(promo: string): PromoEdit {
  const rate = promo.match(RATE);
  if (rate) return { kind: "rate", pct: Number(rate[1]) };

  const amount = promo.match(AMOUNT);
  if (amount) return { kind: "amount", won: Number(amount[1].replace(/,/g, "")) };

  return { kind: "none" };
}

/**
 * 편집값을 promo에 되쓴다. 숫자만 바꾸고 설명("픽업 주문"·"(단골 전용)")은 남긴다.
 * 형태가 문구와 안 맞으면 원문을 그대로 돌려준다 — 편집이 원문을 지워버리면 안 된다.
 */
export function applyPromo(promo: string, edit: PromoEdit): string {
  if (edit.kind === "rate" && RATE.test(promo)) {
    return promo.replace(RATE, `${edit.pct}%`);
  }
  if (edit.kind === "amount" && AMOUNT.test(promo)) {
    return promo.replace(AMOUNT, `${formatWon(edit.won)}원`);
  }
  return promo;
}
