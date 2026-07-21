import { fetchBlobContent } from './githubClient.js';

/**
 * 05_CODE_SCANNER_SCORER.md 6~7장 스코어링/청킹의 임시 대체.
 * 진짜 가중치 계산 대신 경로 알파벳 순 정렬 후 앞쪽 n개를 그대로 후보로 채택한다
 * (6장 "동점은 파일 경로 알파벳 순 타이브레이크"와 같은 원칙 재사용, 목록 전체가 동점인 셈).
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

export async function selectCandidates(owner, repo, candidateFilePaths, n = 3) {
  const sorted = [...candidateFilePaths].sort((a, b) => a.path.localeCompare(b.path));

  const selected = [];
  for (const file of sorted) {
    if (selected.length >= n) break;

    const content = await fetchBlobContent(owner, repo, file.sha);
    if (content === null || content.trim() === '') continue; // 조회 실패 또는 빈 파일이면 다음 후보로 폴백

    selected.push({
      file_path: file.path,
      score: 0,
      score_reason: '임시 선택 (스코어링 로직 도입 전, 분류 목록 순서상 앞쪽 N개)',
      chunks: [{ code_snippet: truncateToLines(content, MAX_LINES), pattern: 'none' }],
    });
  }

  return selected;
}
