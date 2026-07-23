/**
 * 05_CODE_SCANNER_SCORER.md 6장 단순 가중치 스코어링.
 * 최종 점수 = 파일 크기 점수(줄 수 3단계) + 이름 패턴 보너스.
 *
 * 전체 후보 대상 1차 정렬은 원문 조회 없이 Git Trees API의 blob.size(바이트)를
 * 줄 수로 환산한 근사치를 쓴다(같은 6장 "줄 수 계산 방식" 절 참고). 최종 선정된
 * 파일은 원문을 이미 받았으므로 실제 줄 수로 다시 계산해 표시 정확도를 높인다.
 */

import {
  BYTES_PER_LINE,
  SMALL_FILE_MAX_LINES,
  LARGE_FILE_MIN_LINES,
  NAME_PATTERNS,
  NAME_PATTERN_BONUS,
} from '../config.js';

function scoreByLineCount(lineCount) {
  if (lineCount < SMALL_FILE_MAX_LINES) return 0.2;
  if (lineCount <= LARGE_FILE_MIN_LINES) return 1.0;
  return 0.5;
}

export function estimateSizeScore(sizeBytes) {
  return scoreByLineCount(sizeBytes / BYTES_PER_LINE);
}

export function computeSizeScore(lineCount) {
  return scoreByLineCount(lineCount);
}

function matchedNamePattern(path) {
  const lower = path.toLowerCase();
  return NAME_PATTERNS.find((pattern) => lower.includes(pattern)) || null;
}

export function namePatternBonus(path) {
  return matchedNamePattern(path) ? NAME_PATTERN_BONUS : 0;
}

export function buildScoreReason(lineCount, sizeScore, path) {
  const matched = matchedNamePattern(path);
  const sizePart = `파일 크기 점수 ${sizeScore}(실제 ${lineCount}줄)`;
  if (!matched) return sizePart;
  return `${sizePart} + '${matched}' 이름 패턴 보너스 ${NAME_PATTERN_BONUS}`;
}
