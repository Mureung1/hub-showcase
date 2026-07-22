import { supabase } from './supabaseClient';

// MD 리포트 다운로드(/report.md)와 공유 화면(/api/share/:token)이 공유하는 단일 데이터 집계 지점.
// 두 출력이 서로 다른 정보를 보여주는 정합성 문제를 원천 차단하기 위해 쿼리 로직을 하나로 모은다.

export interface ReportEvidenceTag {
  id: string;
  quote: string;
  speaker: string | null;
  badge_label: string | null;
  interviewee_name: string | null;
}

export interface ReportVerificationResult {
  summary: string;
  direction: string;
  key_evidence: string;
  citations: { marker: number; evidence_tag_id: string }[];
  suggested_status: string;
}

export interface ReportHypothesis {
  id: string;
  display_index: number;
  cause: string;
  effect: string;
  status: string;
  verification_status: string;
  verification_result: ReportVerificationResult | null;
  evidence_tags: ReportEvidenceTag[];
}

export interface ProjectReport {
  project: {
    id: string;
    title: string;
    problem_definition: string;
    additional_notes: string | null;
    save_status: string;
    share_token: string;
    created_at: string;
  };
  hypotheses: ReportHypothesis[];
}

export async function getFullProjectReport(projectId: string): Promise<ProjectReport | null> {
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    return null;
  }

  const { data: hypotheses, error: hypothesesError } = await supabase
    .from('hypotheses')
    .select('*')
    .eq('project_id', projectId)
    .order('display_index', { ascending: true });

  if (hypothesesError) {
    throw new Error(`가설 조회에 실패했습니다: ${hypothesesError.message}`);
  }

  const hypothesisIds = (hypotheses ?? []).map((h) => h.id);

  let verificationResults: { hypothesis_id: string }[] = [];
  let evidenceTags: { hypothesis_id: string }[] = [];

  if (hypothesisIds.length > 0) {
    const [vrRes, etRes] = await Promise.all([
      supabase.from('verification_results').select('*').in('hypothesis_id', hypothesisIds),
      supabase
        .from('evidence_tags')
        .select('*, interviews(interviewee_name)')
        .in('hypothesis_id', hypothesisIds),
    ]);

    if (vrRes.error) throw new Error(`검증결과 조회에 실패했습니다: ${vrRes.error.message}`);
    if (etRes.error) throw new Error(`근거 태그 조회에 실패했습니다: ${etRes.error.message}`);

    verificationResults = vrRes.data ?? [];
    evidenceTags = etRes.data ?? [];
  }

  const vrByHypothesis = new Map(verificationResults.map((vr: any) => [vr.hypothesis_id, vr]));
  const evidenceByHypothesis = new Map<string, ReportEvidenceTag[]>();
  for (const tag of evidenceTags as any[]) {
    const list = evidenceByHypothesis.get(tag.hypothesis_id) ?? [];
    list.push({
      id: tag.id,
      quote: tag.quote,
      speaker: tag.speaker,
      badge_label: tag.badge_label,
      interviewee_name: tag.interviews?.interviewee_name ?? null,
    });
    evidenceByHypothesis.set(tag.hypothesis_id, list);
  }

  const reportHypotheses: ReportHypothesis[] = (hypotheses ?? []).map((h) => ({
    id: h.id,
    display_index: h.display_index,
    cause: h.cause,
    effect: h.effect,
    status: h.status,
    verification_status: h.verification_status,
    verification_result: (vrByHypothesis.get(h.id) as ReportVerificationResult) ?? null,
    evidence_tags: evidenceByHypothesis.get(h.id) ?? [],
  }));

  return { project, hypotheses: reportHypotheses };
}
