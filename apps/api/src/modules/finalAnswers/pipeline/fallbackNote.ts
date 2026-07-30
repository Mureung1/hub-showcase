import type { Agenda } from "@decision-log/shared";

/**
 * §5.2 — **코드가 만드는 대체 DecisionNote.**
 *
 * AI가 두 번 실패해도 노트가 없으면 §6이 요구하는 `completed` 전이가 막히고 Question이
 * 갇힌다. SPEC-AI-002에서 같은 구조의 갇힘이 네 번 나왔다(§5.3) — **AI가 실패해도 코드가
 * 최소한을 만든다**는 원칙으로 그 계열을 끊는다.
 *
 * 요약은 아니지만 **사실은 정확하다.** DecisionNote의 목적이 "무엇을 결정했는지 기록"이므로
 * 목적을 충족한다.
 */

/** 첫 문장만 뽑는다. 한국어 종결(다.)과 문장부호를 함께 본다. */
function firstSentence(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  const match = normalized.match(/^[\s\S]*?(다\.|[.!?。])(\s|$)/);
  if (match) return match[0].trim();
  return normalized.length > 120 ? `${normalized.slice(0, 120).trim()}…` : normalized;
}

/**
 * ⚠️ **§12.5 분류 규칙을 지킨다.**
 *
 * 자동 통과 항목(`auto_consensus`·`auto_single_source`)에 "내 결정 반영" 같은
 * **사용자 판단 문구를 쓰지 않는다.** 사용자가 판단한 적 없는 항목에 그렇게 적으면
 * 노트가 사실과 달라진다 — T-019.6에서 실제로 발생했던 결함이다.
 *
 * 그래서 이 대체 노트는 **어느 항목에도 판단 주체를 표기하지 않는다.** 제목과 내용만
 * 적으면 사실만 남고, 자동/수동을 잘못 붙일 여지가 사라진다.
 */
export function buildFallbackNote(input: {
  questionMessage: string;
  agendas: Agenda[];
}): string {
  const passed = input.agendas.filter((a) => a.status === "passed");
  const rejected = input.agendas.filter((a) => a.status === "rejected");

  const lines: string[] = [input.questionMessage.replace(/\s+/g, " ").trim(), ""];

  if (passed.length > 0) {
    lines.push("결정 사항");
    for (const agenda of passed) {
      const detail = agenda.selectedContent
        ? ` — ${firstSentence(agenda.selectedContent)}`
        : "";
      lines.push(`- ${agenda.title}${detail}`);
    }
  }

  if (rejected.length > 0) {
    if (passed.length > 0) lines.push("");
    lines.push("제외한 항목");
    for (const agenda of rejected) lines.push(`- ${agenda.title}`);
  }

  return lines.join("\n").trim();
}
