import type { Proposal } from "shared";
import { checkGuardrails } from "./guardrails";
import { discountKind } from "./promoSync";

/**
 * 제안 품질 루브릭 — LLM 회귀(4-6)에서 날씨×업종 출력을 평가하는 기준.
 *
 * 가드레일(할인율·LMS·금칙어·창작상호)은 **발송 파이프라인이 실제로 강제**하는 안전 항목이라
 * checkGuardrails로 재사용한다. 그 위에 발송을 막지는 않지만 품질상 지켜야 하는 항목을 더한다:
 *  - 한국어 전용(한글이 아닌 문자는 전부 금지, 이모지·숫자·기호는 허용)
 *  - 쿠폰은 금액권("N원 할인")으로만 — 정률(%)·무료 증정 금지
 *  - 손님 문구(title·copy)에 매출·진단 등 내부 정보 노출 금지
 *  - channels가 허용된 enum({instagram,x,dangol}) 안에 있음
 *
 * generate.ts tryGenerate가 **이 함수로 채택 판정**을 한다 — 위반이면 재생성, 재실패면 템플릿
 * 폴백. (예전엔 가드레일만 트리거였고 이건 루브릭 전용이어서, 검사 코드가 여기 있는데도
 * copy에 한자가 섞인 제안이 그대로 저장됐다. 감시만 하는 검사는 아무것도 막지 못한다.)
 *
 * ⚠️ 발송 시점(routes/campaigns.ts)은 checkGuardrails만 쓴다. 여기 기준을 발송에 걸면
 *    사장님이 직접 쓴 "ICE 아메리카노" 같은 문구가 막힌다 — 생성물에 요구하는 기준(품질)과
 *    사람 편집물에 요구하는 기준(안전·법규)은 같지 않다.
 */

/**
 * 한글이 아닌 '문자(Letter)'. 숫자·문장부호·기호·이모지·공백·개행은 letter가 아니라 통과한다.
 *
 * `[^\P{L}\p{Script=Hangul}]` = "letter가 아닌 것도 아니고, 한글도 아닌 것" = 한글 아닌 letter.
 * 이중부정이 읽기 불편하지만, 문자 클래스 차집합(`v` 플래그)을 쓰지 않고 집합 뺄셈을 하는 방법이다.
 *
 * ⚠️ 예전엔 금지 목록(Han·Hiragana·Katakana·A-Za-z)이었다. 목록에 없는 키릴·그리스·아랍·태국은
 *    그대로 통과했고, 실제로 "스콘 1개 бесплат로 드립니다"가 검사를 통과해 저장됐다(2026-07-30).
 *    금지할 것을 세는 대신 허용할 것(한글)만 남기는 방식이라야 다음 언어에도 안 뚫린다.
 * ⚠️ \p{M}(결합기호)을 넣지 말 것 — ☕️ 등의 변이선택자(U+FE0F)가 Mn이라 정상 이모지가 오탐된다.
 */
const NON_KOREAN_LETTER_RE = /[^\P{L}\p{Script=Hangul}]/gu;

/**
 * 한글이 아닌 문자를 중복 없이 모아 반환한다. 빈 배열이면 한국어 전용.
 *
 * 정규식을 직접 export하지 않는 이유: `g` 플래그가 붙어 있어 `.test()`를 쓰면 `lastIndex`가
 * 남아 호출마다 결과가 달라진다. 호출부는 반드시 이 함수를 경유한다.
 */
export function findNonKoreanLetters(text: string): string[] {
  return [...new Set(text.match(NON_KOREAN_LETTER_RE) ?? [])];
}

// 손님에게 보이면 안 되는 내부 정보 단어.
const INTERNAL_WORDS = ["매출", "하락", "진단", "감소", "적자", "손해"];

const ALLOWED_CHANNELS = new Set(["instagram", "x", "dangol"]);

export interface QualityResult {
  ok: boolean;
  violations: string[];
}

/** 제안이 품질 루브릭을 통과하는지 검사한다. storeName을 주면 창작 상호(가드레일)까지 본다. */
export function checkProposalQuality(proposal: Proposal, storeName?: string): QualityResult {
  const violations: string[] = [];

  // 1) 발송 파이프라인이 강제하는 가드레일 재사용
  violations.push(...checkGuardrails(proposal, storeName).violations);

  // 2) 한국어 전용. channels는 instagram·dangol 등 영문이 정상이라 검사 대상이 아니다.
  const fields: [string, string][] = [
    ["title", proposal.title],
    ["copy", proposal.copy],
    ["promo.type", proposal.promo.type],
    ["promo.value", proposal.promo.value],
  ];
  for (const [name, text] of fields) {
    // 걸린 문자를 메시지에 담는다 — 재생성 로그·수리 스크립트에서 무엇이 문제였는지 바로 보인다.
    const foreign = findNonKoreanLetters(text);
    if (foreign.length > 0) violations.push(`비한국어 문자(${name}): ${foreign.join(" ")}`);
  }

  // 3) 쿠폰은 금액권만.
  //
  // 왜 형태를 강제하나: promo가 자유 문구라 "스콘 1개 무료" 같은 값이 들어오면
  //  - maxDiscountPct·maxDiscountWon이 둘 다 0을 읽어 **상한(20%·3,000원)을 그냥 지나간다**
  //    (실측 2026-07-30 "선물 / 스콘 1개 무료" — 원가에 상관없이 무제한 혜택이 저장됐다)
  //  - FE parsePromo가 kind:"none"으로 떨어져 쿠폰 편집칸이 안 뜨고, 문구를 고쳐도
  //    쿠폰에 반영되지 않는다. promoMismatch도 none이면 판정을 안 해 경고조차 없다.
  //
  // 정률(%)이 아니라 금액으로 통일하는 이유: 형태가 하나면 문구↔쿠폰 형태 불일치가
  // 원천적으로 불가능하고, 3,000원 상한이 항상 읽힌다. 손님에게도 "2,000원 할인"이
  // "15% 할인"보다 체감이 분명하다.
  const promoKind = discountKind(proposal.promo.value);
  if (promoKind !== "amount") {
    const reason = promoKind === "rate" ? "정률(%)" : "금액 표기 없음";
    violations.push(`쿠폰이 금액권이 아님(${reason}): ${proposal.promo.value}`);
  }

  // copy도 같이 본다. 쿠폰만 금액권으로 막고 문구에 "10% 할인"이 남으면 문자와 쿠폰이
  // 서로 다른 혜택을 약속한다 — 사장님이 처음 지적한 그 증상이다.
  // ("100% 아라비카"는 안 걸린다. RATE가 "% 할인"에만 앵커돼 있다.)
  if (discountKind(proposal.copy) === "rate") {
    violations.push(`문구에 정률(%) 할인 표기: ${proposal.copy.match(/\d+\s*%\s*할인/)?.[0] ?? ""}`);
  }

  // 4) 손님 문구에 내부 정보 노출 금지 (title·copy)
  const customerFacing = `${proposal.title} ${proposal.copy}`;
  const leaked = INTERNAL_WORDS.filter((w) => customerFacing.includes(w));
  if (leaked.length > 0) violations.push(`내부정보 노출: ${leaked.join(", ")}`);

  // 5) 채널 enum
  const badChannels = proposal.channels.filter((c) => !ALLOWED_CHANNELS.has(c));
  if (badChannels.length > 0) violations.push(`허용 안 된 채널: ${badChannels.join(", ")}`);

  return { ok: violations.length === 0, violations };
}
