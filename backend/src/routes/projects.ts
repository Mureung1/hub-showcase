import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { supabase } from '../lib/supabaseClient';
import { buildAnalysisMarkdown } from '../lib/analysisMarkdown';
import { runAnalysisPipeline } from '../lib/analysisPipeline';
import { refineVerificationSummary } from '../lib/refineHypothesis';

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

    // 상세 화면 최초 조회 시 방문 표시를 남긴다(대시보드의 "검토 전" 태그를 지우는 데 사용).
    // GET에 side effect를 두는 건 이례적이지만, "읽으면 읽음 처리"는 흔한 실용적 패턴이라
    // 별도 PATCH 왕복 없이 여기서 처리한다. 이미 방문했으면 다시 쓰지 않는다.
    if (!hypothesis.viewed_at) {
      const { data: updated, error: viewError } = await supabase
        .from('hypotheses')
        .update({ viewed_at: new Date().toISOString() })
        .eq('id', hid)
        .select()
        .single();
      if (viewError) {
        console.error('Failed to mark hypothesis as viewed:', viewError);
      } else if (updated) {
        hypothesis.viewed_at = updated.viewed_at;
      }
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

    // 반박/의견 리파인 대화 이력(Task 11). "판단 근거가 사슬로 남는다" 원칙에 따라
    // 재방문 시에도 대화가 그대로 복원되도록 여기서 함께 반환한다.
    const { data: refineChats, error: refineChatsError } = await supabase
      .from('refine_chats')
      .select('*')
      .eq('hypothesis_id', hid)
      .order('created_at', { ascending: true });

    if (refineChatsError) {
      console.error('Failed to fetch refine_chats:', refineChatsError);
      return res.status(500).json({ error: '리파인 대화 조회에 실패했습니다.' });
    }

    return res.status(200).json({
      hypothesis,
      verification_result: verificationResult ?? null,
      evidence_tags: evidenceTags ?? [],
      refine_chats: refineChats ?? [],
    });
  },
);

// POST /api/projects/:id/hypotheses/:hid/refine — 반박/의견 프롬프트 → AI 수정 가안.
// 검증결과를 바로 바꾸지 않는다. refine_chats에 user/assistant 메시지를 남기고, 가안은
// FE가 미리보기로만 보여준다. 실제 반영은 별도 /apply 호출에서만 일어난다.
router.post(
  '/:id/hypotheses/:hid/refine',
  async (
    req: Request<{ id: string; hid: string }, {}, { highlighted_text?: string; message?: string }>,
    res: Response,
  ) => {
    const { id, hid } = req.params;
    const { highlighted_text: highlightedText = '', message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'message는 필수입니다.' });
    }

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

    if (vrError || !verificationResult) {
      return res.status(400).json({ error: '검증결과가 아직 없어 리파인할 수 없습니다.' });
    }

    const { data: evidenceTags, error: evidenceError } = await supabase
      .from('evidence_tags')
      .select('id, quote, speaker, badge_label')
      .eq('hypothesis_id', hid);

    if (evidenceError) {
      console.error('Failed to fetch evidence_tags for refine:', evidenceError);
      return res.status(500).json({ error: '근거 태그 조회에 실패했습니다.' });
    }

    let draft;
    try {
      draft = await refineVerificationSummary({
        cause: hypothesis.cause,
        effect: hypothesis.effect,
        currentSummary: verificationResult.summary,
        evidence: (evidenceTags ?? []).map((t) => ({
          evidence_tag_id: t.id,
          quote: t.quote,
          speaker: t.speaker,
          badge_label: t.badge_label,
        })),
        highlightedText,
        userMessage: message,
      });
    } catch (err) {
      console.error('Failed to generate refine draft:', err);
      const errMessage = err instanceof Error ? err.message : 'AI 리파인 생성에 실패했습니다.';
      return res.status(500).json({ error: errMessage });
    }

    const { data: chatRows, error: insertError } = await supabase
      .from('refine_chats')
      .insert([
        { hypothesis_id: hid, role: 'user', message, diff_json: null },
        {
          hypothesis_id: hid,
          role: 'assistant',
          message: draft.reply,
          diff_json: {
            old_text: verificationResult.summary,
            new_text: draft.new_summary,
            new_citations: draft.new_citations,
          },
        },
      ])
      .select();

    if (insertError || !chatRows) {
      console.error('Failed to insert refine_chats:', insertError);
      return res.status(500).json({ error: '리파인 대화 저장에 실패했습니다.' });
    }

    const userChat = chatRows.find((c) => c.role === 'user');
    const assistantChat = chatRows.find((c) => c.role === 'assistant');

    return res.status(200).json({ user_chat: userChat, assistant_chat: assistantChat });
  },
);

// POST /api/projects/:id/hypotheses/:hid/refine/:chatId/apply — 미리보기 가안을 실제 검증결과에 반영.
// 클라이언트가 보낸 텍스트를 신뢰하지 않고, DB에 저장된 diff_json을 다시 읽어 적용한다.
router.post(
  '/:id/hypotheses/:hid/refine/:chatId/apply',
  async (req: Request<{ id: string; hid: string; chatId: string }>, res: Response) => {
    const { hid, chatId } = req.params;

    const { data: chat, error: chatError } = await supabase
      .from('refine_chats')
      .select('*')
      .eq('id', chatId)
      .eq('hypothesis_id', hid)
      .single();

    if (chatError || !chat) {
      return res.status(404).json({ error: '리파인 대화를 찾을 수 없습니다.' });
    }
    if (chat.role !== 'assistant' || !chat.diff_json) {
      return res.status(400).json({ error: '적용할 수 있는 가안이 아닙니다.' });
    }
    if (chat.applied_at) {
      return res.status(400).json({ error: '이미 적용된 가안입니다.' });
    }

    const { new_text: newText, new_citations: newCitations } = chat.diff_json as {
      new_text: string;
      new_citations: unknown;
    };

    const { data: updatedResult, error: updateError } = await supabase
      .from('verification_results')
      .update({ summary: newText, citations: newCitations, updated_at: new Date().toISOString() })
      .eq('hypothesis_id', hid)
      .select()
      .single();

    if (updateError || !updatedResult) {
      console.error('Failed to apply refine draft:', updateError);
      return res.status(500).json({ error: '가안 적용에 실패했습니다.' });
    }

    const { error: markAppliedError } = await supabase
      .from('refine_chats')
      .update({ applied_at: new Date().toISOString() })
      .eq('id', chatId);

    if (markAppliedError) {
      console.error('Failed to mark refine_chats as applied:', markAppliedError);
    }

    return res.status(200).json({ verification_result: updatedResult });
  },
);

// 사용자가 확정하는 판단값. AI 제안값인 verification_status(유력함/근거 부족/수정 필요)와는 별개 컬럼이다.
const ALLOWED_HYPOTHESIS_STATUSES = ['검토 전', '유지', '수정', '폐기'];

interface PatchHypothesisBody {
  status?: string;
  cause?: string;
  effect?: string;
}

// PATCH /api/projects/:id/hypotheses/:hid — 가설 판단(유지/수정/폐기) 확정 및/또는 원인·결과 인라인 수정.
// status·cause·effect 중 있는 필드만 갱신한다(부분 갱신).
// 원인/결과 수정은 현재 덮어쓰기다 — 이전 값을 hypothesis_versions에 append하는 버전 히스토리는
// 아직 붙이지 않았다(Task 12에서 연결 예정). Task 10 완료 조건("인라인 수정 진입점")은 편집·저장
// 동작 자체를 요구하며, 버전 보존은 별도 완료 조건이다.
router.patch(
  '/:id/hypotheses/:hid',
  async (
    req: Request<{ id: string; hid: string }, {}, PatchHypothesisBody>,
    res: Response,
  ) => {
    const { id, hid } = req.params;
    const { status, cause, effect } = req.body;

    if (status === undefined && cause === undefined && effect === undefined) {
      return res.status(400).json({ error: 'status, cause, effect 중 최소 하나는 있어야 합니다.' });
    }

    const updatePayload: Record<string, string> = {};

    if (status !== undefined) {
      if (!ALLOWED_HYPOTHESIS_STATUSES.includes(status)) {
        return res.status(400).json({
          error: `status는 ${ALLOWED_HYPOTHESIS_STATUSES.join(' / ')} 중 하나여야 합니다.`,
        });
      }
      updatePayload.status = status;
    }

    if (cause !== undefined) {
      if (!cause.trim()) {
        return res.status(400).json({ error: 'cause는 빈 문자열일 수 없습니다.' });
      }
      updatePayload.cause = cause.trim();
    }

    if (effect !== undefined) {
      if (!effect.trim()) {
        return res.status(400).json({ error: 'effect는 빈 문자열일 수 없습니다.' });
      }
      updatePayload.effect = effect.trim();
    }

    const { data: hypothesis, error } = await supabase
      .from('hypotheses')
      .update(updatePayload)
      .eq('id', hid)
      .eq('project_id', id)
      .select()
      .single();

    if (error || !hypothesis) {
      // 존재하지 않거나 해당 프로젝트 소속이 아니면 갱신 대상이 없다.
      return res.status(404).json({ error: '가설을 찾을 수 없습니다.' });
    }

    return res.status(200).json({ hypothesis });
  },
);

export default router;
