import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateMonthlyItems,
  findStopCandidates,
  normalizeStopName,
  percentile95,
  scoreCampusUsage,
  scoreDirectionalUsage,
} from './stop-usage.mjs';
import { parseApiPayload } from './public-data-client.mjs';

test('시간대별로 이용자 유형을 합산하고 버스 외 수단을 제외한다', () => {
  const result = aggregateMonthlyItems([
    { tzon: '07', users_type_cd: '01', trfc_mns_se_cd: 'B', ride_nope: '10', goff_nope: '2' },
    { tzon: '07', users_type_cd: '02', trfc_mns_se_cd: 'B', ride_nope: '5', goff_nope: '3' },
    { tzon: '07', trfc_mns_se_cd: 'S', ride_nope: '100', goff_nope: '100' },
    { tzon: '23', trfc_mns_se_cd: 'B', ride_nope: '4', goff_nope: '1' },
  ]);

  assert.equal(result.boardings[7], 15);
  assert.equal(result.alightings[7], 5);
  assert.equal(result.totals[7], 20);
  assert.equal(result.totals[23], 5);
  assert.equal(result.totals.length, 24);
  assert.equal(result.totals[0], 0);
});

test('P95를 캠퍼스 공통 기준으로 0~100점에 환산한다', () => {
  const first = Array.from({ length: 24 }, (_, index) => index + 1);
  const second = Array.from({ length: 24 }, (_, index) => (index + 1) * 2);
  const { reference, scores } = scoreCampusUsage({ first, second });

  assert.equal(reference, percentile95([...first, ...second]));
  assert.equal(scores.first.length, 24);
  assert.equal(scores.second.at(-1), 100);
  assert.ok(scores.first.every((value) => value >= 0 && value <= 100));
});

test('양방향 전체가 하나의 P95 기준을 공유하고 방향 값이 섞이지 않는다', () => {
  const a = Array.from({ length: 24 }, (_, index) => index + 1);
  const c = Array.from({ length: 24 }, (_, index) => (index + 1) * 3);
  const { reference, scores } = scoreDirectionalUsage({ first: { a, c } });

  assert.equal(reference, percentile95([...a, ...c]));
  assert.notDeepEqual(scores.first.a, scores.first.c);
  assert.equal(scores.first.a.length, 24);
  assert.equal(scores.first.c.at(-1), 100);
});

test('정류장명은 공백과 구두점을 제거하되 방향 표기는 보존한다', () => {
  assert.equal(normalizeStopName('경북대학교 정문(건너)'), '경북대학교정문건너');
  assert.notEqual(normalizeStopName('전남대사거리(서)'), normalizeStopName('전남대사거리(동)'));
});

test('정확히 일치하는 정류장만 자동 매핑 후보가 된다', () => {
  const candidates = findStopCandidates('충남대 도서관', [
    { sttn_id: '1', sttn_nm: '충남대도서관' },
    { sttn_id: '2', sttn_nm: '충남대학교' },
  ]);
  assert.deepEqual(candidates.exact.map((item) => item.sttn_id), ['1']);
  assert.equal(candidates.ranked[0].sttn_id, '1');
});

test('공공데이터 오류와 단일 item 응답을 구분한다', () => {
  assert.throws(() => parseApiPayload({ Error: { code: '52', message: 'MISSING_REQUIRED_PARAMETER' } }), /52/);
  const page = parseApiPayload({ response: { header: { resultCode: '200' }, body: { totalCount: 1, items: { item: { sttn_id: '1' } } } } });
  assert.equal(page.totalCount, 1);
  assert.deepEqual(page.items, [{ sttn_id: '1' }]);

  const uppercasePage = parseApiPayload({ Response: { Header: { resultCode: '200' }, Body: { TotalCount: 1, Items: { Item: { STTN_ID: '2' } } } } });
  assert.deepEqual(uppercasePage.items, [{ STTN_ID: '2' }]);
});
