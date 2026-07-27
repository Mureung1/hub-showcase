import { generateStructuredJson } from './geminiClient';
import * as stage3Refine from './prompts/stage3Refine';

// README/AI_Pipeline_Design.md의 3단계(반박/의견 리파인) 설계를 그대로 옮긴 구현체.
// 이것도 초안 제안일 뿐이며, 사용자가 "적용"을 눌러야 verification_results에 반영된다.
// 프롬프트 문자열/스키마는 이 파일이 모른다 — prompts/stage3Refine.ts(Task 24)가 원본이다.

export interface RefineEvidenceRef {
  evidence_tag_id: string;
  quote: string;
  speaker: string | null;
  badge_label: string | null;
}

export interface RefineDraft {
  reply: string;
  new_summary: string;
  new_citations: { marker: number; evidence_tag_id: string }[];
}

export async function refineVerificationSummary(params: {
  cause: string;
  effect: string;
  currentSummary: string;
  evidence: RefineEvidenceRef[];
  highlightedText: string;
  userMessage: string;
}): Promise<RefineDraft> {
  const { cause, effect, currentSummary, evidence, highlightedText, userMessage } = params;

  const prompt = stage3Refine.buildUserPrompt({
    cause,
    effect,
    currentSummary,
    evidence,
    highlightedText,
    userMessage,
  });

  const raw = await generateStructuredJson<RefineDraft>({
    systemInstruction: stage3Refine.systemInstruction,
    prompt,
    responseSchema: stage3Refine.responseSchema as never,
    temperature: stage3Refine.temperature,
  });

  // 환각 방어: 2단계와 동일하게 [n] 마커 집합과 citations.marker가 일치하고,
  // citations가 실제 evidence_tag_id만 참조하는지 검증 후 불일치 항목은 제거한다.
  const validEvidenceIds = new Set(evidence.map((e) => e.evidence_tag_id));
  const markersInSummary = new Set(
    Array.from(raw.new_summary.matchAll(/\[(\d+)\]/g)).map((m) => Number(m[1])),
  );
  const verifiedCitations = raw.new_citations.filter(
    (c) => validEvidenceIds.has(c.evidence_tag_id) && markersInSummary.has(c.marker),
  );

  return { ...raw, new_citations: verifiedCitations };
}
