// ============================================================
// routes/sessions.js — 진단 세션 API
// ============================================================
import { Router } from 'express';
import { supabase } from '../db.js';
import { loadKB } from '../lib/kb.js';
import { toResponse, toHypothesesResponse } from '../lib/label.js';

// 엔진 함수 import
import { bayes } from '../../../packages/kb/engine/core.js';
import { decide, initState } from '../../../packages/kb/engine/policy.js';

const router = Router();

// 세션 ID 생성
function generateSessionId() {
  return 'sess_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

// 턴 ID 생성
function generateTurnId() {
  return 'turn_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/sessions — 새 세션 시작
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { spaceId, domain = 'kitchen_odor' } = req.body;

  if (!spaceId) {
    return res.status(400).json({ error: 'spaceId is required' });
  }

  try {
    // KB 로드
    const kb = await loadKB(domain);

    // 초기 상태 생성
    const state = initState(kb);

    // 세션 생성
    const sessionId = generateSessionId();
    const { error: sessionError } = await supabase
      .from('sessions')
      .insert({
        id: sessionId,
        space_id: spaceId,
        source: 'api',
        status: 'active',
      });

    if (sessionError) {
      return res.status(500).json({ error: sessionError.message });
    }

    // 초기 턴 저장 (turn_index=0, 아직 질문/답변 없음)
    const { error: turnError } = await supabase
      .from('turns')
      .insert({
        id: generateTurnId(),
        session_id: sessionId,
        turn_index: 0,
        question: null,
        user_answer: null,
        posterior_snapshot: state.posterior,
      });

    if (turnError) {
      return res.status(500).json({ error: turnError.message });
    }

    // 첫 결정 얻기
    const decision = decide(kb, state);

    // 응답 반환 (숫자 없음)
    const response = toResponse(sessionId, decision, state, kb);
    res.status(201).json(response);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/sessions/:id/turns — 턴 진행
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/turns', async (req, res) => {
  const { id: sessionId } = req.params;
  const { axisId, answer } = req.body;

  if (!axisId || !answer) {
    return res.status(400).json({ error: 'axisId and answer are required' });
  }

  try {
    // 세션 확인
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select()
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'active') {
      return res.status(409).json({ error: 'Session is not active' });
    }

    // KB 로드 (도메인은 kitchen_odor 고정, 나중에 세션에서 읽도록 확장 가능)
    const kb = await loadKB('kitchen_odor');

    // 가장 최근 턴에서 posterior 읽기
    const { data: lastTurn, error: turnError } = await supabase
      .from('turns')
      .select()
      .eq('session_id', sessionId)
      .order('turn_index', { ascending: false })
      .limit(1)
      .single();

    if (turnError || !lastTurn) {
      return res.status(500).json({ error: 'Failed to read last turn' });
    }

    const prevPosterior = lastTurn.posterior_snapshot;
    const turnIndex = lastTurn.turn_index + 1;

    // asked 집합 복원 (이전 턴들에서 질문 ID 수집)
    const { data: allTurns } = await supabase
      .from('turns')
      .select('question')
      .eq('session_id', sessionId)
      .not('question', 'is', null);

    const asked = new Set(allTurns?.map(t => t.question) || []);
    asked.add(axisId);

    // 해당 observable 찾기
    const obs = kb.observables.find(o => o.id === axisId);
    if (!obs) {
      return res.status(400).json({ error: `Unknown axisId: ${axisId}` });
    }

    // 선택한 답변의 likelihood 찾기
    const selectedOption = obs.options[answer];
    if (!selectedOption) {
      return res.status(400).json({ error: `Unknown answer: ${answer}` });
    }

    // 베이즈 갱신
    const newPosterior = bayes(prevPosterior, selectedOption.L);

    // 새 턴 저장
    const { error: insertError } = await supabase
      .from('turns')
      .insert({
        id: generateTurnId(),
        session_id: sessionId,
        turn_index: turnIndex,
        question: axisId,
        user_answer: answer,
        posterior_snapshot: newPosterior,
      });

    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }

    // 상태 구성
    const state = {
      posterior: newPosterior,
      turn: turnIndex,
      asked,
      verified: new Set(),
    };

    // 다음 결정
    const decision = decide(kb, state);

    // 응답 반환
    const response = toResponse(sessionId, decision, state, kb);
    res.json(response);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/sessions/:id/done — 세션 완료
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/done', async (req, res) => {
  const { id: sessionId } = req.params;
  const { endReason } = req.body;

  try {
    // 세션 확인
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select()
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // KB 로드
    const kb = await loadKB('kitchen_odor');

    // 최종 posterior 읽기
    const { data: lastTurn } = await supabase
      .from('turns')
      .select('posterior_snapshot')
      .eq('session_id', sessionId)
      .order('turn_index', { ascending: false })
      .limit(1)
      .single();

    // 최종 진단 라벨 계산
    const hypotheses = toHypothesesResponse(lastTurn?.posterior_snapshot || {}, kb);
    const topHypothesis = hypotheses[0];

    // 세션 종료 업데이트 — 라벨만 저장, 숫자 금지
    const { error: updateError } = await supabase
      .from('sessions')
      .update({
        status: 'closed',
        final_cause: topHypothesis?.id || null,
        ended_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    res.json({ sessionId, done: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
