import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDday, ddayValue } from './store.js';

test('formatDday: 오늘 이후 날짜는 D-n', () => {
  process.env.DEMO_TODAY = '2026-07-21';
  assert.equal(formatDday('2026-07-23'), 'D-2');
});

test('formatDday: 오늘 이전 날짜는 D+n', () => {
  process.env.DEMO_TODAY = '2026-07-21';
  assert.equal(formatDday('2026-07-19'), 'D+2');
});

test('formatDday: 오늘이면 D-0', () => {
  process.env.DEMO_TODAY = '2026-07-21';
  assert.equal(formatDday('2026-07-21'), 'D-0');
});

test('ddayValue: D-n은 양수로, D+n은 음수로 뒤집는다', () => {
  assert.equal(ddayValue('D-2'), 2);
  assert.equal(ddayValue('D+3'), -3);
  assert.equal(ddayValue('D-0'), 0);
});
