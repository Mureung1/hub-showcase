import type {
  AgendaDraft,
  Candidate,
  DraftSourceRef,
  PipelineSection,
} from "../agendas.types.js";

/**
 * 단계 5 · 후처리 (SPEC-AI-002 §7, 코드).
 * 후보를 균일 초안으로 굳힌다: 참여 provider 수 계산(§7.2)·title·summary 채우기(§7.4)·
 * displayOrder 부여(§7.5). kind·stances·selectedContent는 채우지 않는다 — 단계 7(T-019.3).
 */

const TITLE_MAX = 200;

function truncateTitle(title: string): string {
  const trimmed = title.trim();
  return trimmed.length > TITLE_MAX ? trimmed.slice(0, TITLE_MAX) : trimmed;
}

/** content의 첫 문장. 한국어 종결(다.)과 문장부호를 모두 본다. 없으면 앞부분을 자른다. */
export function firstSentence(text: string): string {
  const normalized = text.trim();
  const match = normalized.match(/^[\s\S]*?(다\.|[.!?。])(\s|$)/);
  if (match) return match[0].trim();
  return normalized.length > 120 ? normalized.slice(0, 120).trim() : normalized;
}

function toSourceRef(section: PipelineSection): DraftSourceRef {
  return {
    provider: section.provider,
    sourceAnswerId: section.sourceAnswerId,
    sectionId: section.sectionId,
    title: section.title,
    content: section.content,
  };
}

/** 참여 provider 수 = 배정된 섹션의 서로 다른 provider 수(§7.2, 코드가 센다). */
function countParticipants(sections: PipelineSection[]): number {
  return new Set(sections.map((s) => s.provider)).size;
}

/**
 * 후보 목록 → 초안 목록. 섹션 0개 후보는 폐기하고, displayOrder는
 * pivot 유래(pivot 섹션 order 순) → 신규(생성 순)로 부여한다(§7.5).
 */
export function finalizeDrafts(candidates: Candidate[]): AgendaDraft[] {
  const usable = candidates.filter((c) => c.sections.length > 0);

  // §7.5: pivot 유래 먼저(pivot 섹션 order ↑), 그다음 신규(생성 순). 안정 정렬.
  const ordered = [...usable].sort((a, b) => {
    if (a.origin !== b.origin) return a.origin === "pivot" ? -1 : 1;
    if (a.origin === "pivot") return (a.pivotOrder ?? 0) - (b.pivotOrder ?? 0);
    return a.createdOrder - b.createdOrder;
  });

  return ordered.map((c, index) => {
    const title = truncateTitle(c.title || c.summarySource);
    const summaryRaw = firstSentence(c.summarySource);
    // summary가 비면 title로 대체해 NOT NULL을 보장한다(§7.4).
    const summary = summaryRaw.length > 0 ? summaryRaw : title;
    return {
      id: c.id,
      title: title.length > 0 ? title : "(제목 없음)",
      summary,
      displayOrder: index,
      participantCount: countParticipants(c.sections),
      sourceRefs: c.sections.map(toSourceRef),
      origin: c.origin,
    };
  });
}
