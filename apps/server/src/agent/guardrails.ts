import type { Proposal } from "shared";

/**
 * 제안 가드레일 — LLM이 프롬프트 지시를 어겨도 서버가 코드로 강제한다.
 * - 할인율 ≤ 20% (정률 쿠폰)
 * - 할인액 ≤ 3,000원 (정액 쿠폰 — "세트 2,000원 할인"류)
 * - LMS 2,000byte 이내 (EUC-KR 근사)
 * - 금칙어(의료 효능·과장 표현) 차단
 * - 창작 상호 차단 — 제목에 매장명과 다른 "◯◯카페"류 상호를 지어내는 실사고 방지
 *   (실례: llama가 "김사장 카페" 제안 제목을 "그레이스카페 오늘의 혜택"으로 뽑음)
 * 위반 시 generate.ts가 재생성 → 재실패 시 템플릿 폴백으로 흐른다.
 */

const MAX_DISCOUNT = 20;
/**
 * 정액 쿠폰 상한(원). 정률 20%와 눈높이를 맞춘 값이다 —
 * 카페 객단가를 7,000~10,000원(세트 포함)으로 보면 20%가 1,400~2,000원이고,
 * 세트 상품에 여유를 줘 3,000원으로 뒀다. 상향하려면 이 값만 바꾸면 된다.
 * (stores에 객단가 컬럼이 없어 매장별 계산은 못 한다 — 후속: 객단가 확보 시 비율로 전환)
 */
const MAX_DISCOUNT_WON = 3000;
const MAX_LMS_BYTES = 2000;

const BANNED_WORDS = [
  // 의료 효능·과장
  "치료",
  "완치",
  "효능",
  "특효",
  "의학",
  // 절대·과장 표현
  "최고",
  "최상",
  "1등",
  "무조건",
  "유일",
  "100%",
];

export interface GuardrailResult {
  ok: boolean;
  violations: string[];
}

/** SMS/LMS byte 길이 근사 (EUC-KR: 한글·비ASCII 2byte, ASCII 1byte). */
export function lmsByteLength(text: string): number {
  let bytes = 0;
  for (const ch of text) {
    bytes += ch.charCodeAt(0) < 128 ? 1 : 2;
  }
  return bytes;
}

/** 상호 접미사 — 제목 속 "◯◯카페"처럼 붙여 쓴 상호 후보를 찾는 데 쓴다. */
const BRAND_SUFFIXES = ["카페", "베이커리", "식당"];

/**
 * 제목에서 매장명과 다른 창작 상호를 찾는다 (예: "그레이스카페").
 * 매장명은 공백을 지워 비교하므로 "김사장카페"처럼 붙여 쓴 자기 상호는 허용된다.
 * copy는 메뉴·일반 명사("동네카페" 등) 오탐 위험이 있어 제목만 검사한다.
 */
function foreignBrandsInTitle(title: string, storeName: string): string[] {
  const normalized = storeName.replace(/\s+/g, "");
  const re = new RegExp(`[가-힣A-Za-z]{2,}(?:${BRAND_SUFFIXES.join("|")})`, "g");
  const candidates = [...new Set([...title.matchAll(re)].map((m) => m[0]))];
  return candidates.filter((c) => !normalized.includes(c));
}

/**
 * 텍스트에서 최대 할인율(%)을 추출. 없으면 0.
 *
 * 뒤에 "할인"이 붙었는지 안 따진다 — "30% 세일"처럼 다르게 쓴 위반도 잡아야 한다.
 * FE promo.ts의 RATE는 반대로 "N% 할인"만 본다: 저쪽은 숫자를 고치는 쪽이라 넓게 잡으면
 * "100% 아라비카"를 할인율로 바꿔버린다. 강제는 넓게, 편집은 좁게 — 목적이 반대다.
 */
function maxDiscountPct(text: string): number {
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
function maxDiscountWon(text: string): number {
  const nums = [...text.matchAll(/([\d,]+)\s*원(?=\s*(?:할인|쿠폰))/g)].map((m) =>
    Number(m[1].replace(/,/g, "")),
  );
  return nums.length > 0 ? Math.max(...nums) : 0;
}

/** 제안이 모든 가드레일을 통과하는지 검사한다. storeName을 주면 창작 상호도 검사한다. */
export function checkGuardrails(proposal: Proposal, storeName?: string): GuardrailResult {
  const violations: string[] = [];
  const full = `${proposal.title} ${proposal.copy} ${proposal.promo.value}`;

  if (storeName) {
    const foreign = foreignBrandsInTitle(proposal.title, storeName);
    if (foreign.length > 0) {
      violations.push(`창작 상호: ${foreign.join(", ")}`);
    }
  }

  const discount = maxDiscountPct(full);
  if (discount > MAX_DISCOUNT) {
    violations.push(`할인율 ${discount}% (상한 ${MAX_DISCOUNT}%)`);
  }

  const discountWon = maxDiscountWon(full);
  if (discountWon > MAX_DISCOUNT_WON) {
    violations.push(
      `할인액 ${discountWon.toLocaleString("ko-KR")}원 (상한 ${MAX_DISCOUNT_WON.toLocaleString("ko-KR")}원)`,
    );
  }

  const bytes = lmsByteLength(proposal.copy);
  if (bytes > MAX_LMS_BYTES) {
    violations.push(`LMS ${bytes}byte (상한 ${MAX_LMS_BYTES})`);
  }

  const hits = BANNED_WORDS.filter((w) => full.includes(w));
  if (hits.length > 0) {
    violations.push(`금칙어: ${hits.join(", ")}`);
  }

  return { ok: violations.length === 0, violations };
}
