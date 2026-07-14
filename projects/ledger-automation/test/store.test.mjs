// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { addEntry, loadEntries, removeEntry, ValidationError } from '../src/store.mjs';

const VALID = {
  date: '2025-01-31',
  description: '테스트 매출',
  lines: [
    { accountCode: '103', debit: 110000, credit: 0 },
    { accountCode: '401', debit: 0, credit: 100000 },
    { accountCode: '255', debit: 0, credit: 10000 },
  ],
};

test('저장소: 추가 → 조회 → 삭제 라운드트립', async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ledger-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'entries.json');

  assert.deepEqual(await loadEntries(file), [], '파일이 없으면 빈 배열');

  const saved = await addEntry(VALID, file);
  assert.ok(saved.id, 'id가 발급된다');

  const loaded = await loadEntries(file);
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].description, '테스트 매출');

  assert.equal(await removeEntry(saved.id, file), true);
  assert.equal(await removeEntry(saved.id, file), false, '없는 id는 false');
  assert.deepEqual(await loadEntries(file), []);
});

test('저장소: 날짜순으로 정렬해 저장한다', async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ledger-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'entries.json');

  await addEntry({ ...VALID, date: '2025-03-01' }, file);
  await addEntry({ ...VALID, date: '2025-01-01' }, file);
  const dates = (await loadEntries(file)).map((e) => e.date);
  assert.deepEqual(dates, ['2025-01-01', '2025-03-01']);
});

test('저장소: 잘못된 전표는 ValidationError로 거부하고 파일을 만들지 않는다', async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ledger-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'entries.json');

  const bad = { ...VALID, lines: [{ accountCode: '103', debit: 1, credit: 0 }, { accountCode: '401', debit: 0, credit: 2 }] };
  await assert.rejects(() => addEntry(bad, file), ValidationError);
  assert.deepEqual(await loadEntries(file), []);
});
