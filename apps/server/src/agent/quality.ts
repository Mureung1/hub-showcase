import type { Proposal } from "shared";
import { checkGuardrails } from "./guardrails";

/**
 * 제안 품질 루브릭 — LLM 회귀(4-6)에서 날씨×업종 출력을 평가하는 기준.
 *
 * 가드레일(할인율·LMS·금칙어·창작상호)은 **발송 파이프라인이 실제로 강제**하는 안전 항목이라
 * checkGuardrails로 재사용한다. 그 위에 발송을 막지는 않지만 품질상 지켜야 하는 항목을 더한다:
 *  - 한국어 전용(프롬프트 규칙: 한자·일본어·영어 단어 금지, 이모지·숫자·기호는 허용)
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

// 한자(Han)·히라가나·가타카나·라틴 문자가 하나라도 있으면 비한국어로 본다. (Hangul·이모지·숫자·기호는 허용)
const NON_KOREAN_RE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}A-Za-z]/u;

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

  // 2) 한국어 전용
  const fields: [string, string][] = [
    ["title", proposal.title],
    ["copy", proposal.copy],
    ["promo", proposal.promo.value],
  ];
  for (const [name, text] of fields) {
    if (NON_KOREAN_RE.test(text)) violations.push(`비한국어 문자(${name})`);
  }

  // 3) 손님 문구에 내부 정보 노출 금지 (title·copy)
  const customerFacing = `${proposal.title} ${proposal.copy}`;
  const leaked = INTERNAL_WORDS.filter((w) => customerFacing.includes(w));
  if (leaked.length > 0) violations.push(`내부정보 노출: ${leaked.join(", ")}`);

  // 4) 채널 enum
  const badChannels = proposal.channels.filter((c) => !ALLOWED_CHANNELS.has(c));
  if (badChannels.length > 0) violations.push(`허용 안 된 채널: ${badChannels.join(", ")}`);

  return { ok: violations.length === 0, violations };
}
