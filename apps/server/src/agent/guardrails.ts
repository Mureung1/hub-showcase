import type { Proposal } from "shared";

/**
 * 제안 가드레일 — LLM이 프롬프트 지시를 어겨도 서버가 코드로 강제한다.
 * - 할인율 ≤ 20%
 * - LMS 2,000byte 이내 (EUC-KR 근사)
 * - 금칙어(의료 효능·과장 표현) 차단
 * 위반 시 generate.ts가 재생성 → 재실패 시 템플릿 폴백으로 흐른다.
 */

const MAX_DISCOUNT = 20;
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

/** 텍스트에서 최대 할인율(%)을 추출. 없으면 0. */
function maxDiscountPct(text: string): number {
  const nums = [...text.matchAll(/(\d+)\s*%/g)].map((m) => Number(m[1]));
  return nums.length > 0 ? Math.max(...nums) : 0;
}

/** 제안이 모든 가드레일을 통과하는지 검사한다. */
export function checkGuardrails(proposal: Proposal): GuardrailResult {
  const violations: string[] = [];
  const full = `${proposal.title} ${proposal.copy} ${proposal.promo.value}`;

  const discount = maxDiscountPct(full);
  if (discount > MAX_DISCOUNT) {
    violations.push(`할인율 ${discount}% (상한 ${MAX_DISCOUNT}%)`);
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
