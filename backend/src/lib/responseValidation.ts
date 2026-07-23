// Gemini 응답 환각 방어 (Task 16).
// hypothesisTagger(1단계)와 verificationResult(2단계)가 공통으로 쓰는
// "원문/입력과 대조해 근거 없는 항목을 저장 전에 폐기" 로직을 순수 함수로 분리한 모듈.

export interface HypothesisIdRef {
  hypothesis_id: string;
}

interface EvidenceItem {
  hypothesis_id: string;
  quote: string;
}

// 1단계 응답 검증: hypothesis_id가 입력 가설 목록에 실제로 존재하고,
// quote가 전사문 원문에 실제로 등장하는 항목만 통과시킨다.
export function filterVerifiedEvidenceItems<T extends EvidenceItem>(
  items: T[],
  hypotheses: HypothesisIdRef[],
  transcript: string,
): T[] {
  const validHypothesisIds = new Set(hypotheses.map((h) => h.hypothesis_id));
  return items.filter(
    (item) => validHypothesisIds.has(item.hypothesis_id) && transcript.includes(item.quote),
  );
}

export interface EvidenceIdRef {
  evidence_tag_id: string;
}

interface Citation {
  marker: number;
  evidence_tag_id: string;
}

// 2단계 응답 검증: citation이 가리키는 evidence_tag_id가 입력 근거 목록에 실제로 존재하고,
// citation의 marker가 summary 본문에 [n] 형태로 실제 등장하는 경우만 통과시킨다.
export function filterVerifiedCitations<T extends Citation>(
  citations: T[],
  summary: string,
  evidence: EvidenceIdRef[],
): T[] {
  const validEvidenceIds = new Set(evidence.map((e) => e.evidence_tag_id));
  const markersInSummary = new Set(
    Array.from(summary.matchAll(/\[(\d+)\]/g)).map((m) => Number(m[1])),
  );

  return citations.filter(
    (c) => validEvidenceIds.has(c.evidence_tag_id) && markersInSummary.has(c.marker),
  );
}
