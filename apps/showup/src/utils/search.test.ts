// TDD: search.ts 테스트 — red (실행 전 실패 확인) → green (구현 통과)

import { extractSearchPhoneLast4, isNameSearch } from './search';

let failed = 0;
let passed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${label}`);
  } else {
    failed++;
    console.error(`  FAIL: ${label}`);
  }
}

function test(name: string, fn: () => void) {
  console.log(`\n${name}`);
  fn();
}

// --- extractSearchPhoneLast4 ---

test('extractSearchPhoneLast4: 숫자 4자리 → 그대로 반환', () => {
  assert(extractSearchPhoneLast4('5678') === '5678', '"5678" → "5678"');
});

test('extractSearchPhoneLast4: 하이픈 포함 전화번호 → 마지막 4자리', () => {
  assert(extractSearchPhoneLast4('010-1234-5678') === '5678', '"010-1234-5678" → "5678"');
});

test('extractSearchPhoneLast4: 4자리 초과 숫자 → 마지막 4자리', () => {
  assert(extractSearchPhoneLast4('12345678') === '5678', '"12345678" → "5678"');
});

test('extractSearchPhoneLast4: 4자리 미만 숫자 → null', () => {
  assert(extractSearchPhoneLast4('123') === null, '"123" → null');
});

test('extractSearchPhoneLast4: 빈 문자열 → null', () => {
  assert(extractSearchPhoneLast4('') === null, '"" → null');
});

test('extractSearchPhoneLast4: 공백만 → null', () => {
  assert(extractSearchPhoneLast4('   ') === null, '"   " → null');
});

test('extractSearchPhoneLast4: 숫자+문자 혼합 → 마지막 4자리', () => {
  assert(extractSearchPhoneLast4('김철수5678') === '5678', '"김철수5678" → "5678"');
});

test('extractSearchPhoneLast4: 숫자 5자리 → 마지막 4자리', () => {
  assert(extractSearchPhoneLast4('05678') === '5678', '"05678" → "5678"');
});

// --- isNameSearch ---

test('isNameSearch: 한글 이름 → true', () => {
  assert(isNameSearch('김철수') === true, '"김철수" → true');
});

test('isNameSearch: 숫자 4자리 → false (전화번호 검색)', () => {
  assert(isNameSearch('5678') === false, '"5678" → false');
});

test('isNameSearch: 숫자 3자리 → true (4자리 미만)', () => {
  assert(isNameSearch('123') === true, '"123" → true');
});

test('isNameSearch: 빈 문자열 → false', () => {
  assert(isNameSearch('') === false, '"" → false');
});

test('isNameSearch: 하이픈 포함 전화번호 → false (전화번호 검색)', () => {
  assert(isNameSearch('010-1234-5678') === false, '"010-1234-5678" → false (숫자 11자리)');
});

// --- 결과 ---

console.log(`\n--- 결과: ${passed} passed, ${failed} failed ---`);
if (failed > 0) {
  console.error('TESTS FAILED');
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED');
}