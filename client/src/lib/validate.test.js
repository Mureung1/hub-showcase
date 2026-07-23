import { expect, test } from 'vitest';

import { validateTitle } from './validate';

test('정상 제목은 통과한다', () => {
  expect(validateTitle('장보기')).toBe(true);
});

test('빈 문자열은 거절한다', () => {
  expect(validateTitle('')).toBe(false);
});

test('공백만 있으면 거절한다', () => {
  expect(validateTitle('   ')).toBe(false);
});
