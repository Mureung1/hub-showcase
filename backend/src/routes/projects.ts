import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { supabase } from '../lib/supabaseClient';
import { buildAnalysisMarkdown } from '../lib/analysisMarkdown';
import { runAnalysisPipeline } from '../lib/analysisPipeline';

const router = Router();
const ANALYSIS_REQUESTS_DIR = path.join(__dirname, '..', '..', '..', 'analysis_requests');

interface HypothesisInput {
  cause?: string;
  effect?: string;
}

interface InterviewInput {
  interviewee_name?: string;
  transcript?: string;
}

interface CreateProjectBody {
  title?: string;
  problem_definition?: string;
  additional_notes?: string;
  hypotheses?: HypothesisInput[];
  interviews?: InterviewInput[];
}

router.post('/', async (req: Request<{}, {}, CreateProjectBody>, res: Response) => {
  const { title, problem_definition, additional_notes, hypotheses, interviews } = req.body;

  if (!problem_definition || !problem_definition.trim()) {
    return res.status(400).json({ error: 'problem_definition은 필수입니다.' });
  }
  if (!Array.isArray(hypotheses) || hypotheses.length === 0) {
    return res.status(400).json({ error: '가설을 최소 1개 이상 입력해주세요.' });
  }
  const invalidIndex = hypotheses.findIndex((h) => !h.cause?.trim() || !h.effect?.trim());
  if (invalidIndex !== -1) {
    return res.status(400).json({ error: `${invalidIndex + 1}번째 가설의 원인/결과를 모두 입력해주세요.` });
  }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      title: title?.trim() || problem_definition.trim().slice(0, 80),
      problem_definition: problem_definition.trim(),
      additional_notes: additional_notes?.trim() || null,
    })
    .select()
    .single();

  if (projectError || !project) {
    console.error('Failed to insert project:', projectError);
    return res.status(500).json({ error: '프로젝트 저장에 실패했습니다.' });
  }

  const hypothesesToInsert = hypotheses.map((h, index) => ({
    project_id: project.id,
    display_index: index,
    cause: h.cause!.trim(),
    effect: h.effect!.trim(),
  }));

  const { data: insertedHypotheses, error: hypothesesError } = await supabase
    .from('hypotheses')
    .insert(hypothesesToInsert)
    .select();

  if (hypothesesError) {
    console.error('Failed to insert hypotheses:', hypothesesError);
    await supabase.from('projects').delete().eq('id', project.id);
    return res.status(500).json({ error: '가설 저장에 실패했습니다.' });
  }

  // 인터뷰 전사문은 선택 사항. transcript가 비어있지 않은 항목만 저장한다.
  const interviewsToInsert = (interviews ?? [])
    .filter((i) => i.transcript?.trim())
    .map((i) => ({
      project_id: project.id,
      interviewee_name: i.interviewee_name?.trim() || null,
      transcript: i.transcript!.trim(),
    }));

  let insertedInterviews: unknown[] = [];
  if (interviewsToInsert.length > 0) {
    const { data, error: interviewsError } = await supabase
      .from('interviews')
      .insert(interviewsToInsert)
      .select();

    if (interviewsError) {
      console.error('Failed to insert interviews:', interviewsError);
      await supabase.from('projects').delete().eq('id', project.id);
      return res.status(500).json({ error: '인터뷰 전사문 저장에 실패했습니다.' });
    }
    insertedInterviews = data ?? [];
  }

  return res.status(201).json({
    project_id: project.id,
    project,
    hypotheses: insertedHypotheses,
    interviews: insertedInterviews,
  });
});

router.post('/:id/analyze', async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (projectError || !project) {
    return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
  }

  const { data: hypotheses, error: hypothesesError } = await supabase
    .from('hypotheses')
    .select('*')
    .eq('project_id', id)
    .order('display_index', { ascending: true });

  if (hypothesesError) {
    console.error('Failed to fetch hypotheses:', hypothesesError);
    return res.status(500).json({ error: '가설 조회에 실패했습니다.' });
  }

  const { data: interviews, error: interviewsError } = await supabase
    .from('interviews')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: true });

  if (interviewsError) {
    console.error('Failed to fetch interviews:', interviewsError);
    return res.status(500).json({ error: '인터뷰 조회에 실패했습니다.' });
  }

  // MD 파일 생성은 디버깅/로그용으로 유지. AI 분석 파이프라인의 입력과는 무관하다.
  const markdown = buildAnalysisMarkdown(project, hypotheses ?? [], interviews ?? []);
  const filePath = path.join(ANALYSIS_REQUESTS_DIR, `project_${id}.md`);

  try {
    fs.mkdirSync(ANALYSIS_REQUESTS_DIR, { recursive: true });
    fs.writeFileSync(filePath, markdown, 'utf-8');
  } catch (err) {
    console.error('Failed to write analysis markdown file:', err);
    return res.status(500).json({ error: '분석 요청 파일 생성에 실패했습니다.' });
  }

  try {
    const { evidenceTags, verificationResults } = await runAnalysisPipeline({
      hypotheses: hypotheses ?? [],
      interviews: interviews ?? [],
    });

    return res.status(200).json({
      project_id: id,
      file_path: `analysis_requests/project_${id}.md`,
      evidence_tag_count: evidenceTags.length,
      verification_results: verificationResults,
    });
  } catch (err) {
    console.error('Failed to run analysis pipeline:', err);
    const message = err instanceof Error ? err.message : 'AI 분석 파이프라인 실행에 실패했습니다.';
    return res.status(500).json({ error: message });
  }
});

// GET /api/projects/:id — 대시보드용. project + 각 가설에 verification_result를 붙여 한 번에 반환.
router.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (projectError || !project) {
    return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
  }

  const { data: hypotheses, error: hypothesesError } = await supabase
    .from('hypotheses')
    .select('*')
    .eq('project_id', id)
    .order('display_index', { ascending: true });

  if (hypothesesError) {
    console.error('Failed to fetch hypotheses:', hypothesesError);
    return res.status(500).json({ error: '가설 조회에 실패했습니다.' });
  }

  const hypothesisIds = (hypotheses ?? []).map((h) => h.id);
  let verificationResults: { hypothesis_id: string }[] = [];
  if (hypothesisIds.length > 0) {
    const { data, error: vrError } = await supabase
      .from('verification_results')
      .select('*')
      .in('hypothesis_id', hypothesisIds);
    if (vrError) {
      console.error('Failed to fetch verification_results:', vrError);
      return res.status(500).json({ error: '검증결과 조회에 실패했습니다.' });
    }
    verificationResults = data ?? [];
  }

  const vrByHypothesis = new Map(verificationResults.map((vr) => [vr.hypothesis_id, vr]));
  const hypothesesWithResults = (hypotheses ?? []).map((h) => ({
    ...h,
    verification_result: vrByHypothesis.get(h.id) ?? null,
  }));

  return res.status(200).json({ project, hypotheses: hypothesesWithResults });
});

// GET /api/projects/:id/hypotheses/:hid — 상세 화면용.
// 검증결과 + citations + 근거 태그(전사문 발췌 + 화자 + 출처 인터뷰) 반환.
router.get(
  '/:id/hypotheses/:hid',
  async (req: Request<{ id: string; hid: string }>, res: Response) => {
    const { id, hid } = req.params;

    const { data: hypothesis, error: hypothesisError } = await supabase
      .from('hypotheses')
      .select('*')
      .eq('id', hid)
      .eq('project_id', id)
      .single();

    if (hypothesisError || !hypothesis) {
      return res.status(404).json({ error: '가설을 찾을 수 없습니다.' });
    }

    const { data: verificationResult, error: vrError } = await supabase
      .from('verification_results')
      .select('*')
      .eq('hypothesis_id', hid)
      .maybeSingle();

    if (vrError) {
      console.error('Failed to fetch verification_result:', vrError);
      return res.status(500).json({ error: '검증결과 조회에 실패했습니다.' });
    }

    // 근거 태그 + 출처 인터뷰명을 함께 조회(드로어의 "전사문 발췌 + 화자" 렌더용).
    const { data: evidenceTags, error: evidenceError } = await supabase
      .from('evidence_tags')
      .select('*, interviews(interviewee_name)')
      .eq('hypothesis_id', hid)
      .order('created_at', { ascending: true });

    if (evidenceError) {
      console.error('Failed to fetch evidence_tags:', evidenceError);
      return res.status(500).json({ error: '근거 태그 조회에 실패했습니다.' });
    }

    return res.status(200).json({
      hypothesis,
      verification_result: verificationResult ?? null,
      evidence_tags: evidenceTags ?? [],
    });
  },
);

export default router;
