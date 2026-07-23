import { test, expect } from 'vitest';
import { hasCheckedInToday } from './hasCheckedInToday';

// 스펙 (준비 → 실행 → 확인):
// | 입력 | 기대 결과 | 이유 |
// |---|---|---|
// | lastCheck 없음(null) | false | 기록 자체가 없음 |
// | lastCheck 없음(undefined) | false | 로딩 전이거나 아직 안 불러옴 |
// | created_at이 오늘 | true | 오늘 이미 체크인함 |
// | created_at이 어제 | false | 하루가 지났으니 다시 체크인해야 함 |
// | created_at이 오늘 00:00:01(자정 직후) | true | 시각과 무관하게 "같은 날짜"면 true |
// | created_at이 오늘 23:59:59(자정 직전) | true | 위와 동일 |
// | created_at이 파싱 안 되는 문자열 | false | 이상한 값은 안전하게 "체크인 안 함"으로 취급 |

const NOW = new Date('2026-07-23T09:00:00');

test('lastCheck가 null이면 false', () => {
  expect(hasCheckedInToday(null, NOW)).toBe(false);
});

test('lastCheck가 undefined이면 false', () => {
  expect(hasCheckedInToday(undefined, NOW)).toBe(false);
});

test('오늘 기록이면 true', () => {
  const lastCheck = { created_at: '2026-07-23T02:00:00' };
  expect(hasCheckedInToday(lastCheck, NOW)).toBe(true);
});

test('어제 기록이면 false', () => {
  const lastCheck = { created_at: '2026-07-22T23:59:59' };
  expect(hasCheckedInToday(lastCheck, NOW)).toBe(false);
});

test('오늘 자정 직후 기록이어도 true', () => {
  const lastCheck = { created_at: '2026-07-23T00:00:01' };
  expect(hasCheckedInToday(lastCheck, NOW)).toBe(true);
});

test('오늘 자정 직전 기록이어도 true', () => {
  const lastCheck = { created_at: '2026-07-23T23:59:59' };
  expect(hasCheckedInToday(lastCheck, NOW)).toBe(true);
});

test('created_at을 날짜로 해석할 수 없으면 false', () => {
  const lastCheck = { created_at: '이상한값' };
  expect(hasCheckedInToday(lastCheck, NOW)).toBe(false);
});
