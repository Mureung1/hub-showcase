import { Router } from 'express';
import { repositories, interviews, createId, createInterviewState } from '../state/store.js';
import { buildFixedQuestion } from '../services/stubData.js';
import { buildMarkdown } from '../services/markdownBuilder.js';
import { ok, fail } from '../services/respond.js';

/**
 * Day 1 Walking Skeleton.
 *
 * - Question Generator: buildFixedQuestion()의 고정 문구 (Day 7에서 실제 LLM 프롬프트로 교체)
 * - Ambiguity Checker: judgement/content_type을 항상 SUFFICIENT/IMPLEMENTATION_INTRO로 고정 (Day 8에서 교체)
 * - Writer/Tone Agent: 답변을 톤 교정 없이 그대로 markdownBuilder에 붙임 (Day 9에서 교체)
 *
 * current_candidate_index / current_chunk_index로 진행 상태를 추적하는 구조는
 * 04_AI_AGENT_SPEC.md 9장, 08_DATABASE.md 8장과 동일하게 맞춰뒀다.
 */

const router = Router();

function getCurrentChunk(state) {
  const file = state.candidateFiles[state.currentCandidateIndex];
  if (!file) return null;
  const chunk = file.chunks[state.currentChunkIndex];
  if (!chunk) return null;
  return { file, chunk };
}

function advance(state) {
  const file = state.candidateFiles[state.currentCandidateIndex];
  if (state.currentChunkIndex + 1 < file.chunks.length) {
    state.currentChunkIndex += 1;
  } else {
    state.currentCandidateIndex += 1;
    state.currentChunkIndex = 0;
  }
}

router.post('/interviews', (req, res) => {
  const { repository_id } = req.body || {};
  const repo = repositories.get(repository_id);
  if (!repo) {
    return fail(res, 404, 'REPOSITORY_NOT_FOUND', '해당 repository_id를 찾을 수 없습니다.');
  }

  const interviewId = createId('interview');
  const state = createInterviewState({
    interviewId,
    repositoryId: repository_id,
    candidateFiles: repo.candidates,
    context: repo.context,
  });

  const current = getCurrentChunk(state);
  if (!current) {
    return fail(res, 400, 'NO_CANDIDATE', '인터뷰할 후보 파일이 없습니다.');
  }

  const { question, cited_code } = buildFixedQuestion(current.chunk);
  state.pendingQuestion = { question, cited_code };
  state.portfolioMarkdown = buildMarkdown(state);

  ok(res, { interview_id: interviewId, question, cited_code }, 201);
});

router.post('/interviews/:interviewId/messages', (req, res) => {
  const state = interviews.get(req.params.interviewId);
  if (!state) {
    return fail(res, 404, 'INTERVIEW_NOT_FOUND', '해당 interview_id를 찾을 수 없습니다.');
  }
  if (!state.pendingQuestion) {
    return fail(res, 400, 'INTERVIEW_ALREADY_FINISHED', '더 이상 진행할 질문이 없습니다.');
  }

  const { answer } = req.body || {};
  if (!answer || typeof answer !== 'string') {
    return fail(res, 400, 'INVALID_ANSWER', 'answer를 입력해주세요.');
  }

  // Ambiguity Checker 스텁: 항상 SUFFICIENT / IMPLEMENTATION_INTRO로 고정
  const judgement = 'SUFFICIENT';
  const contentType = 'IMPLEMENTATION_INTRO';

  state.messages.push({
    candidateFileIndex: state.currentCandidateIndex,
    chunkIndex: state.currentChunkIndex,
    question: state.pendingQuestion.question,
    citedCode: state.pendingQuestion.cited_code,
    answer,
    judgement,
    contentType,
    isFollowUp: false,
  });

  advance(state);
  const next = getCurrentChunk(state);

  let nextQuestion = null;
  if (next) {
    const generated = buildFixedQuestion(next.chunk);
    state.pendingQuestion = generated;
    nextQuestion = generated.question;
  } else {
    state.pendingQuestion = null;
  }

  state.portfolioMarkdown = buildMarkdown(state);

  ok(res, {
    judgement,
    content_type: contentType,
    next_question: nextQuestion,
    next_cited_code: next ? state.pendingQuestion.cited_code : null,
    portfolio_markdown: state.portfolioMarkdown,
  });
});

router.get('/interviews/:interviewId/markdown', (req, res) => {
  const state = interviews.get(req.params.interviewId);
  if (!state) {
    return fail(res, 404, 'INTERVIEW_NOT_FOUND', '해당 interview_id를 찾을 수 없습니다.');
  }
  ok(res, { portfolio_markdown: state.portfolioMarkdown });
});

router.post('/interviews/:interviewId/complete', (req, res) => {
  const state = interviews.get(req.params.interviewId);
  if (!state) {
    return fail(res, 404, 'INTERVIEW_NOT_FOUND', '해당 interview_id를 찾을 수 없습니다.');
  }
  state.status = 'COMPLETED';
  ok(res, { interview_id: state.interviewId, status: state.status });
});

router.get('/interviews/:interviewId/export/md', (req, res) => {
  const state = interviews.get(req.params.interviewId);
  if (!state) {
    return fail(res, 404, 'INTERVIEW_NOT_FOUND', '해당 interview_id를 찾을 수 없습니다.');
  }
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="portfolio.md"');
  res.send(state.portfolioMarkdown || '');
});

export default router;
