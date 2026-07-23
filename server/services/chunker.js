/**
 * 05_CODE_SCANNER_SCORER.md 7장 "대표 코드 스니펫 추출" — 200줄 기준 하이브리드 청킹.
 *
 * 200줄 이하 파일은 자르지 않고 전체를 블록 1개로 취급, 200줄 초과 파일은
 * 정규식(함수 시그니처)+중괄호 카운팅으로 최상위 함수 블록을 분리한다.
 * 블록마다 키워드 패턴(try-catch/async-await/state-management/performance)을
 * 매칭해 우선순위 상위 최대 2개를 chunk로 채택하고, 매칭이 없으면 가장 큰
 * 블록 1개를 pattern:"none"으로 폴백한다(파일당 최소 1문항 보장).
 *
 * AST 파서 없이 문자 단위 상태 추적(문자열/템플릿 리터럴/주석)만으로 중괄호
 * 오탐을 줄이는 근사치 구현이다 — 정규식 리터럴 안의 중괄호 등 잔여 오탐은
 * 감수한다(기획서가 명시한 휴리스틱 한계).
 */

import { CHUNK_SHORT_FILE_MAX_LINES as SHORT_FILE_MAX_LINES, CHUNK_MAX_PER_FILE as MAX_CHUNKS_PER_FILE } from '../config.js';

const FUNCTION_START_REGEX = /^\s*(export\s+)?(default\s+)?(async\s+)?function\s*\*?\s*[\w$]*\s*\(/;
const ARROW_ASSIGN_REGEX = /^\s*(export\s+)?(const|let|var)\s+[\w$]+\s*=\s*(async\s*)?\([^)]*\)\s*=>\s*\{/;

const PATTERN_RULES = [
  { pattern: 'try-catch', regex: /\btry\s*\{/ },
  { pattern: 'async-await', regex: /\basync\b|\bawait\b/ },
  { pattern: 'state-management', regex: /\buseState\s*\(/ },
  { pattern: 'performance', regex: /\buseMemo\s*\(|\buseCallback\s*\(|\bReact\.memo\b/ },
];

function matchPattern(code) {
  const rule = PATTERN_RULES.find((r) => r.regex.test(code));
  return rule ? rule.pattern : null;
}

function isBlockStart(line) {
  return FUNCTION_START_REGEX.test(line) || ARROW_ASSIGN_REGEX.test(line);
}

/**
 * 한 줄의 문자를 훑으며 문자열/템플릿 리터럴/주석 안의 중괄호를 세지 않도록
 * 상태를 유지한 채 순수 코드 영역의 '{'/'}' 개수 차이를 반환한다.
 * state: { inBlockComment, inTemplate } — 줄 사이에 이어지는 상태만 넘겨받는다.
 */
function countBraceDelta(line, state) {
  let delta = 0;
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    const next = line[i + 1];

    if (state.inBlockComment) {
      if (ch === '*' && next === '/') {
        state.inBlockComment = false;
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }

    if (state.inTemplate) {
      if (ch === '\\') {
        i += 2;
        continue;
      }
      if (ch === '`') {
        state.inTemplate = false;
      }
      i += 1;
      continue;
    }

    if (ch === '"' || ch === "'") {
      const quote = ch;
      i += 1;
      while (i < line.length) {
        if (line[i] === '\\') {
          i += 2;
          continue;
        }
        if (line[i] === quote) {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }

    if (ch === '`') {
      state.inTemplate = true;
      i += 1;
      continue;
    }

    if (ch === '/' && next === '/') {
      break; // 나머지는 line comment, 이 줄 스캔 종료
    }

    if (ch === '/' && next === '*') {
      state.inBlockComment = true;
      i += 2;
      continue;
    }

    if (ch === '{') delta += 1;
    if (ch === '}') delta -= 1;
    i += 1;
  }
  return delta;
}

/**
 * 파일 전체 라인 배열에서 최상위 함수 블록만 추출한다.
 * 중첩 함수는 별도 블록으로 만들지 않고(최상위만), 블록 끝 다음 줄부터 재개한다.
 */
function extractTopLevelBlocks(lines) {
  const blocks = [];
  const commentState = { inBlockComment: false, inTemplate: false };
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!isBlockStart(line)) {
      // 블록 시작이 아닌 줄도 상태(주석/템플릿)는 계속 추적해야 이후 판정이 정확하다.
      countBraceDelta(line, commentState);
      i += 1;
      continue;
    }

    const blockState = { inBlockComment: commentState.inBlockComment, inTemplate: commentState.inTemplate };
    let depth = 0;
    let end = i;
    let opened = false;

    for (let j = i; j < lines.length; j += 1) {
      const delta = countBraceDelta(lines[j], blockState);
      depth += delta;
      if (delta !== 0) opened = true;
      if (opened && depth <= 0) {
        end = j;
        break;
      }
      end = j;
    }

    blocks.push({ startLine: i, endLine: end, code: lines.slice(i, end + 1).join('\n') });

    // 상위 스캔 상태를 블록 끝까지 이어받아 이후 코드의 주석/템플릿 판정을 유지한다.
    commentState.inBlockComment = blockState.inBlockComment;
    commentState.inTemplate = blockState.inTemplate;
    i = end + 1;
  }

  return blocks;
}

function lineCount(code) {
  return code.split('\n').length;
}

export function extractChunks(content) {
  const lines = content.split('\n');

  if (lines.length <= SHORT_FILE_MAX_LINES) {
    return [{ code_snippet: content, pattern: matchPattern(content) ?? 'none' }];
  }

  const blocks = extractTopLevelBlocks(lines);

  if (blocks.length === 0) {
    // 정규식이 함수 시작을 하나도 못 찾은 경우의 안전망: 앞부분 200줄을 단일 블록으로.
    const fallback = lines.slice(0, SHORT_FILE_MAX_LINES).join('\n');
    return [{ code_snippet: fallback, pattern: 'none' }];
  }

  const matched = blocks
    .map((block) => ({ ...block, pattern: matchPattern(block.code) }))
    .filter((block) => block.pattern !== null);

  if (matched.length === 0) {
    const largest = blocks.reduce((a, b) => (lineCount(b.code) > lineCount(a.code) ? b : a));
    return [{ code_snippet: largest.code, pattern: 'none' }];
  }

  const priorityIndex = (pattern) => PATTERN_RULES.findIndex((r) => r.pattern === pattern);
  matched.sort((a, b) => priorityIndex(a.pattern) - priorityIndex(b.pattern));

  return matched
    .slice(0, MAX_CHUNKS_PER_FILE)
    .map((block) => ({ code_snippet: block.code, pattern: block.pattern }));
}
