import type { Proposal } from "shared";

/**
 * 제안 정규화 — LLM이 copy와 promo에 서로 다른 할인 숫자를 쓴 것을 맞춘다.
 *
 * 실제로 자주 난다(실측: 7일치 제안 중 2건).
 *   copy  "오늘 픽업 주문 15% 할인해 드려요"
 *   promo "픽업 21% 할인"
 * 스키마·가드레일은 둘 다 통과한다 — 형태가 맞고 각각은 상한 안이라서다. 그래서
 * 자기모순인 제안이 그대로 저장되고, 쿠폰과 문자가 다른 혜택을 약속한 채 발송된다.
 *
 * **copy를 기준으로 promo를 맞춘다.** 손님이 읽고 기대하는 건 문자에 적힌 숫자고,
 * 쿠폰은 그 약속을 이행하는 수단이기 때문이다. (FE의 문구→쿠폰 동기화와 같은 방향)
 *
 * 정규식은 guardrails.ts가 아니라 apps/web/src/promo.ts 쪽과 같은 앵커 방식이다.
 * 강제(guardrails)는 위반을 빠짐없이 잡아야 해서 모든 N%를 보고, 정규화(여기)는
 * 숫자를 고치는 쪽이라 "N% 할인"만 봐야 한다 — 넓게 잡으면 copy의 "100% 아라비카"를
 * 할인율로 착각해 promo를 100%로 만들어 버린다.
 */

const RATE = /(\d+)\s*%(?=\s*할인)/g;
const AMOUNT = /([\d,]+)\s*원(?=\s*(?:할인|쿠폰))/g;

/** 혜택 형태. none = %도 원도 못 읽음(무료 증정·1+1 등). */
export type DiscountKind = "rate" | "amount" | "none";

/**
 * 문구의 혜택 형태만 판별한다.
 *
 * 서버에서 형태를 보는 곳(quality.ts의 금액권 강제)이 자기 정규식을 새로 두지 않게 하려고
 * 여기서 내보낸다 — 같은 규칙이 여러 벌 복사되면 반드시 어긋난다(2026-07-30 비한국어 검사 사례).
 */
export function discountKind(text: string): DiscountKind {
  return readDiscount(text)?.kind ?? "none";
}

/** 문구에서 첫 할인 표기를 읽는다. 못 읽으면 null. */
function readDiscount(text: string): { kind: "rate" | "amount"; raw: string } | null {
  const rate = [...text.matchAll(RATE)][0];
  if (rate) return { kind: "rate", raw: `${rate[1]}%` };

  const amount = [...text.matchAll(AMOUNT)][0];
  if (amount) return { kind: "amount", raw: `${amount[1]}원` };

  return null;
}

/**
 * promo의 할인 숫자를 copy에 맞춘다.
 *
 * 아래는 손대지 않는다(원문 보존이 잘못 고치는 것보다 낫다):
 *  - copy나 promo 한쪽에 할인 표기가 없을 때 — 맞출 기준이 없다
 *  - 형태가 다를 때(copy는 %, promo는 원) — 되쓸 자리가 없다. FE promoMismatch가 경고로 잡는다
 */
export function syncPromoToCopy(proposal: Proposal): Proposal {
  const inCopy = readDiscount(proposal.copy);
  const inPromo = readDiscount(proposal.promo.value);
  if (!inCopy || !inPromo || inCopy.kind !== inPromo.kind) return proposal;
  if (inCopy.raw === inPromo.raw) return proposal;

  const re = inCopy.kind === "rate" ? RATE : AMOUNT;
  return {
    ...proposal,
    promo: { ...proposal.promo, value: proposal.promo.value.replace(re, inCopy.raw) },
  };
}
