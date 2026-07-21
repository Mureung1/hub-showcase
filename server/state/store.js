import { randomUUID } from 'crypto';

/**
 * Day 1 Walking Skeleton: 인메모리 상태 저장소.
 * 실제 DB(08_DATABASE.md)로 교체되기 전까지 이 파일이 InterviewSession 역할을 대신한다.
 * Day 11에서 이 Map들을 DB 조회/저장으로 교체할 예정 (진행 상태 키 이름은 DB 스키마와 동일하게 맞춰둠).
 */

export const repositories = new Map();
// repository_id -> {
//   repositoryUrl, defaultBranch, totalFileCount,
//   candidateFilePaths, contextFilePaths, lastScannedAt,   // 실제 Git Trees API 분류 결과
//   candidates, context,                                   // Day 1 스코어링/청킹 스텁 (인터뷰용, 계속 유지)
// }
export const interviews = new Map(); // interview_id -> InterviewSessionState

export function createId(prefix) {
  return `${prefix}_${randomUUID()}`;
}

export function createInterviewState({ interviewId, repositoryId, candidateFiles, context }) {
  const state = {
    interviewId,
    repositoryId,
    status: 'IN_PROGRESS', // IN_PROGRESS | COMPLETED
    candidateFiles, // [{ file_path, score, reason, chunks: [{ code_snippet, pattern }] }]
    context, // { project_overview, tech_stack }
    currentCandidateIndex: 0,
    currentChunkIndex: 0,
    messages: [], // [{ candidateFileIndex, chunkIndex, question, citedCode, answer, judgement, contentType, isFollowUp }]
    createdAt: new Date().toISOString(),
  };
  interviews.set(interviewId, state);
  return state;
}
