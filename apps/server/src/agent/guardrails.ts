import type { Proposal } from "shared";

/**
 * 제안 가드레일 — LLM이 프롬프트 지시를 어겨도 서버가 코드로 강제한다.
 * - 할인율 ≤ 20%
 * - LMS 2,000byte 이내 (EUC-KR 근사)
 * - 금칙어(의료 효능·과장 표현) 차단
 * - 창작 상호 차단 — 제목에 매장명과 다른 "◯◯카페"류 상호를 지어내는 실사고 방지
 *   (실례: llama가 "김사장 카페" 제안 제목을 "그레이스카페 오늘의 혜택"으로 뽑음)
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

/** 텍스트에서 최대 할인율(%)을 추출. 없으면 0. */
function maxDiscountPct(text: string): number {
  const nums = [...text.matchAll(/(\d+)\s*%/g)].map((m) => Number(m[1]));
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
