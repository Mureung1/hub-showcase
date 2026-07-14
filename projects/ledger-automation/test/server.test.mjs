// @ts-check
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { createApp } from '../server.mjs';

// node --test는 테스트 파일마다 프로세스를 분리하므로 여기서 env를 바꿔도 다른 테스트에 영향이 없다.
// store가 호출 시점에 LEDGER_DATA_FILE을 읽기 때문에 listen 전에만 설정하면 된다.
/** @type {string} */ let dir;
/** @type {import('node:http').Server} */ let server;
/** @type {string} */ let base;

const VALID = {
  date: '2025-01-31',
  description: '통합테스트 매출',
  lines: [
    { accountCode: '103', debit: 110000, credit: 0 },
    { accountCode: '401', debit: 0, credit: 100000 },
    { accountCode: '255', debit: 0, credit: 10000 },
  ],
};

before(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'ledger-server-'));
  process.env.LEDGER_DATA_FILE = path.join(dir, 'entries.json');
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const address = /** @type {import('node:net').AddressInfo} */ (server.address());
  base = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  server.close();
  await rm(dir, { recursive: true, force: true });
});

test('GET /api/accounts: 계정과목 마스터를 반환한다', async () => {
  const res = await fetch(`${base}/api/accounts`);
  assert.equal(res.status, 200);
  const accounts = /** @type {{ code: string }[]} */ (await res.json());
  assert.ok(Array.isArray(accounts));
  assert.ok(accounts.some((a) => a.code === '103'));
});

test('POST /api/entries: 잘못된 전표는 400과 오류 목록을 반환하고 저장하지 않는다', async () => {
  const bad = { ...VALID, lines: [{ accountCode: '103', debit: 1, credit: 0 }, { accountCode: '401', debit: 0, credit: 2 }] };
  const res = await fetch(`${base}/api/entries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(bad),
  });
  assert.equal(res.status, 400);
  const body = /** @type {{ errors: string[] }} */ (await res.json());
  assert.ok(body.errors.some((m) => m.includes('일치하지')));

  const list = /** @type {unknown[]} */ (await (await fetch(`${base}/api/entries`)).json());
  assert.deepEqual(list, []);
});

test('전표 라운드트립: POST 201 → GET 목록 → DELETE 204 → 재삭제 404', async () => {
  const created = await fetch(`${base}/api/entries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(VALID),
  });
  assert.equal(created.status, 201);
  const entry = /** @type {{ id: string, description: string }} */ (await created.json());
  assert.ok(entry.id, '생성된 전표에 id가 발급된다');

  const list = /** @type {{ id: string }[]} */ (await (await fetch(`${base}/api/entries`)).json());
  assert.equal(list.length, 1);
  assert.equal(list[0].id, entry.id);

  const removed = await fetch(`${base}/api/entries/${entry.id}`, { method: 'DELETE' });
  assert.equal(removed.status, 204);
  assert.deepEqual(await (await fetch(`${base}/api/entries`)).json(), []);

  const again = await fetch(`${base}/api/entries/${entry.id}`, { method: 'DELETE' });
  assert.equal(again.status, 404);
});

test('GET /api/export.xlsx: 다운로드 헤더와 함께 시트 3장짜리 엑셀을 내려준다', async () => {
  const res = await fetch(`${base}/api/export.xlsx`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /spreadsheetml/);
  assert.match(res.headers.get('content-disposition') ?? '', /attachment/);
  assert.match(res.headers.get('content-disposition') ?? '', /filename\*=UTF-8''/);

  const wb = new ExcelJS.Workbook();
  // exceljs 타입 선언이 자체 Buffer만 받게 되어 있으나 런타임은 Node Buffer도 지원 — 캐스트로 우회
  const buf = /** @type {import('exceljs').Buffer} */ (/** @type {unknown} */ (Buffer.from(await res.arrayBuffer())));
  await wb.xlsx.load(buf);
  assert.deepEqual(wb.worksheets.map((w) => w.name), ['합계잔액시산표', '재무상태표', '손익계산서']);
});
