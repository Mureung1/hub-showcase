import { fetchBlobContent } from './githubClient.js';
import { estimateSizeScore, computeSizeScore, namePatternBonus, buildScoreReason } from './scorer.js';

/**
 * 05_CODE_SCANNER_SCORER.md 6~7장 스코어링/청킹.
 * 1차 점수(원문 조회 없이 blob.size 근사)로 전체 후보를 정렬한 뒤,
 * 상위 n개만 원문을 받아 실제 줄 수로 점수를 재계산한다.
 *
 * 각 파일의 앞부분 최대 MAX_LINES줄을 그대로 하나의 chunk로 사용하고 pattern은
 * 항상 "none" — 이는 7장에 이미 정의된 "패턴 미감지 시 폴백" 규칙 그대로다.
 * 진짜 정규식 기반 함수 블록 분리는 다음 단계에서 이 파일 내부만 교체하면 된다.
 */

const MAX_LINES = 200;

function truncateToLines(content, maxLines) {
  const lines = content.split('\n');
  return lines.slice(0, maxLines).join('\n');
}

function roundToTenth(n) {
  return Math.round(n * 10) / 10;
}

function rankCandidates(candidateFilePaths) {
  return [...candidateFilePaths].sort((a, b) => {
    const scoreA = roundToTenth(estimateSizeScore(a.size) + namePatternBonus(a.path));
    const scoreB = roundToTenth(estimateSizeScore(b.size) + namePatternBonus(b.path));
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a.path.localeCompare(b.path);
  });
}

export async function selectCandidates(owner, repo, candidateFilePaths, n = 3) {
  const ranked = rankCandidates(candidateFilePaths);

  const selected = [];
  for (const file of ranked) {
    if (selected.length >= n) break;

    const content = await fetchBlobContent(owner, repo, file.sha);
    if (content === null || content.trim() === '') continue; // 조회 실패 또는 빈 파일이면 다음 후보로 폴백

    const truncated = truncateToLines(content, MAX_LINES);
    const lineCount = content.split('\n').length;
    const sizeScore = computeSizeScore(lineCount);
    const bonus = namePatternBonus(file.path);

    selected.push({
      file_path: file.path,
      score: roundToTenth(sizeScore + bonus),
      score_reason: buildScoreReason(lineCount, sizeScore, file.path),
      chunks: [{ code_snippet: truncated, pattern: 'none' }],
    });
  }

  return selected;
}
