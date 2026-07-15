import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { supabase } from '../lib/supabaseClient';
import { buildAnalysisMarkdown } from '../lib/analysisMarkdown';

const router = Router();
const ANALYSIS_REQUESTS_DIR = path.join(__dirname, '..', '..', '..', 'analysis_requests');

interface HypothesisInput {
  cause?: string;
  effect?: string;
}

interface CreateProjectBody {
  title?: string;
  problem_definition?: string;
  additional_notes?: string;
  hypotheses?: HypothesisInput[];
}

router.post('/', async (req: Request<{}, {}, CreateProjectBody>, res: Response) => {
  const { title, problem_definition, additional_notes, hypotheses } = req.body;

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

  return res.status(201).json({
    project_id: project.id,
    project,
    hypotheses: insertedHypotheses,
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

  const markdown = buildAnalysisMarkdown(project, hypotheses ?? []);
  const filePath = path.join(ANALYSIS_REQUESTS_DIR, `project_${id}.md`);

  try {
    fs.mkdirSync(ANALYSIS_REQUESTS_DIR, { recursive: true });
    fs.writeFileSync(filePath, markdown, 'utf-8');
  } catch (err) {
    console.error('Failed to write analysis markdown file:', err);
    return res.status(500).json({ error: '분석 요청 파일 생성에 실패했습니다.' });
  }

  return res.status(200).json({
    project_id: id,
    file_path: `analysis_requests/project_${id}.md`,
  });
});

export default router;
