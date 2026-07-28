/**
 * 쿠폰 혜택 편집 유틸. (QW-4)
 *
 * promo는 자유 문구라 혜택 형태가 두 가지로 들어온다 —
 *   정률: "픽업 주문 10% 할인 (오늘 하루)"
 *   정액: "따뜻한 세트 2,000원 할인 (단골 전용)"
 * 예전엔 % 전용 정규식 하나로 둘을 같이 다뤄서, %가 없는 정액 쿠폰의 원문이 통째로
 * "0% 할인"으로 덮어써졌다(문구는 2,000원인데 쿠폰은 0%, editedPromo·SNS 캡션까지 그 값).
 * 이제 형태를 PromoEdit으로 갈라, 화면이 % 입력·원 입력·편집불가 셋 중 하나만 띄운다.
 *
 * applyPromo는 promo뿐 아니라 발송 문구(copy)에도 그대로 쓴다 — 쿠폰만 12%로 바꾸고
 * 문자는 10% 할인이라고 나가면 손님에게 서로 다른 혜택을 약속하는 문자가 실제로 발송된다.
 *
 * 상한(정률 ≤20% · 정액 ≤3,000원) 최종 강제는 서버 agent/guardrails.ts 몫이고
 * 여기서는 표시·편집·안내만 한다.
 */

/** 쿠폰 편집 상태. none = 혜택 형태를 못 읽어 편집 대상이 아님(원문 보존). */
export type PromoEdit =
  | { kind: "rate"; pct: number }
  | { kind: "amount"; won: number }
  | { kind: "none" };

/*
 * 두 패턴 모두 "할인"·"쿠폰"이 뒤따르는 숫자만 잡는다. 앵커가 없으면 편집이 엉뚱한
 * 숫자를 건드린다 — copy의 "100% 아라비카 원두"가 "12% 아라비카 원두"로, promo의
 * "5,000원 이상 주문 시"가 할인액으로 바뀐다. 좁게 잡아 못 읽으면 kind:"none"으로
 * 떨어져 원문이 그대로 남으니, 넓게 잡아 잘못 고치는 쪽보다 안전하다.
 *
 * 서버 guardrails.ts와의 관계 — AMOUNT는 같은 정규식이지만 정률은 다르다.
 * 서버는 위반을 '빠짐없이 잡아야' 하므로 모든 N%를 보고(maxDiscountPct),
 * 여기는 '잘못 고치지 않아야' 하므로 N% 할인만 본다. 목적이 반대라 범위도 반대다.
 *
 * g 플래그는 문구에 혜택이 두 번 나올 때 둘 다 바꾸기 위한 것이다("10% 할인 …
 * 오늘만 10% 할인"에서 하나만 바뀌면 문자 안에서 값이 어긋난다).
 * lastIndex 오염을 피하려고 탐지는 test()가 아니라 matchAll()로 한다.
 */
const RATE = /(\d+)\s*%(?=\s*할인)/g;
const AMOUNT = /([\d,]+)\s*원(?=\s*(?:할인|쿠폰))/g;

/** 1000 → "1,000" (쿠폰 문구용 천단위 구분). */
function formatWon(won: number): string {
  return won.toLocaleString("ko-KR");
}

/**
 * promo 문구에서 혜택 형태와 값을 읽는다.
 * %가 있으면 정률이 우선이다 — "픽업 10% 할인 (5,000원 이상)"처럼 둘이 같이 나오면
 * 사장님이 조절할 대상은 할인율이고 금액은 조건이다.
 */
export function parsePromo(promo: string): PromoEdit {
  const rate = [...promo.matchAll(RATE)][0];
  if (rate) return { kind: "rate", pct: Number(rate[1]) };

  const amount = [...promo.matchAll(AMOUNT)][0];
  if (amount) return { kind: "amount", won: Number(amount[1].replace(/,/g, "")) };

  return { kind: "none" };
}

/**
 * 편집값을 문구에 되쓴다. promo·copy 양쪽에 같이 쓴다.
 * 숫자만 바꾸고 나머지 말("픽업 주문"·"(단골 전용)"·이모지)은 건드리지 않는다.
 * 형태가 문구와 안 맞으면 바뀌는 게 없어 원문이 그대로 남는다.
 */
export function applyPromo(text: string, edit: PromoEdit): string {
  if (edit.kind === "rate") return text.replace(RATE, `${edit.pct}%`);
  if (edit.kind === "amount") return text.replace(AMOUNT, `${formatWon(edit.won)}원`);
  return text;
}
