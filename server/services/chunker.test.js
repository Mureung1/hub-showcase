// @vitest-environment node
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { extractChunks } from './chunker.js';

function linesOf(n, filler = '// filler') {
  return Array.from({ length: n }, () => filler).join('\n');
}

test('200줄 이하 파일은 자르지 않고 전체를 chunk 1개로 반환한다', () => {
  const content = `function small() {\n  return 1;\n}`;
  const chunks = extractChunks(content);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].code_snippet, content);
  assert.equal(chunks[0].pattern, 'none');
});

test('200줄 이하 파일도 패턴이 있으면 pattern이 감지된다', () => {
  const content = `function load() {\n  try {\n    doWork();\n  } catch (e) {\n    handle(e);\n  }\n}`;
  const chunks = extractChunks(content);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].pattern, 'try-catch');
});

test('200줄 초과 + 중첩 중괄호를 가진 함수 블록 경계를 올바르게 분리한다', () => {
  const nestedFn = [
    'function outer() {',
    '  if (true) {',
    '    for (let i = 0; i < 10; i += 1) {',
    '      console.log(i);',
    '    }',
    '  }',
    '  return null;',
    '}',
  ].join('\n');
  const content = `${linesOf(210)}\n${nestedFn}\n${linesOf(5)}`;

  const chunks = extractChunks(content);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].pattern, 'none');
  assert.ok(chunks[0].code_snippet.startsWith('function outer() {'));
  assert.ok(chunks[0].code_snippet.trim().endsWith('}'));
});

test('try-catch와 state-management 블록이 함께 있으면 우선순위대로 상위 2개까지만 채택한다', () => {
  const tryCatchFn = [
    'function fetchData() {',
    '  try {',
    '    return call();',
    '  } catch (e) {',
    '    return null;',
    '  }',
    '}',
  ].join('\n');
  const useStateFn = [
    'function useCounter() {',
    '  const [count, setCount] = useState(0);',
    '  return count;',
    '}',
  ].join('\n');
  const anotherUseStateFn = [
    'function useToggle() {',
    '  const [on, setOn] = useState(false);',
    '  return on;',
    '}',
  ].join('\n');

  const content = `${linesOf(205)}\n${useStateFn}\n${anotherUseStateFn}\n${tryCatchFn}`;

  const chunks = extractChunks(content);
  assert.ok(chunks.length <= 2);
  assert.equal(chunks[0].pattern, 'try-catch');
  if (chunks.length === 2) {
    assert.equal(chunks[1].pattern, 'state-management');
  }
});

test('패턴이 하나도 감지되지 않으면 가장 큰 블록 1개를 pattern:none으로 반환한다', () => {
  const smallFn = ['function tiny() {', '  return 1;', '}'].join('\n');
  const bigFn = [
    'function bigger() {',
    '  const a = 1;',
    '  const b = 2;',
    '  const c = 3;',
    '  return a + b + c;',
    '}',
  ].join('\n');

  const content = `${linesOf(205)}\n${smallFn}\n${bigFn}`;

  const chunks = extractChunks(content);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].pattern, 'none');
  assert.ok(chunks[0].code_snippet.startsWith('function bigger() {'));
});

test('문자열/주석 안의 중괄호는 블록 경계 판정을 깨뜨리지 않는다', () => {
  const fn = [
    'function withTrickyBraces() {',
    '  const msg = "if (x) { return }";',
    '  // comment with a brace {',
    '  /* block comment {',
    '     still inside } */',
    '  const template = `value: ${1 + 1} }`;',
    '  try {',
    '    return msg;',
    '  } catch (e) {',
    '    return template;',
    '  }',
    '}',
  ].join('\n');
  const content = `${linesOf(205)}\n${fn}\n${linesOf(3)}`;

  const chunks = extractChunks(content);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].pattern, 'try-catch');
  assert.ok(chunks[0].code_snippet.startsWith('function withTrickyBraces() {'));
  assert.ok(chunks[0].code_snippet.trim().endsWith('}'));
});
