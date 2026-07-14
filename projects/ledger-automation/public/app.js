// @ts-check
// 전표 입력 UI — 별도 상태 객체 없이 "DOM이 곧 상태"로 동작한다 (이 규모에서 상태 이중화가 최대 버그 원인).
// 타입은 서버 쪽 모듈의 JSDoc typedef를 type-only로 가져와 재사용한다 (런타임 import 아님).

/** @typedef {import('../src/accounts.mjs').Account} Account */
/** @typedef {import('../src/store.mjs').Entry} Entry */

/** @type {Pick<Account, 'code' | 'name'>[]} */
let accounts = [];

const form = /** @type {HTMLFormElement} */ (document.getElementById('entry-form'));
const linesBody = /** @type {HTMLTableSectionElement} */ (document.getElementById('lines-body'));
const lineTemplate = /** @type {HTMLTemplateElement} */ (document.getElementById('line-template'));
const saveButton = /** @type {HTMLButtonElement} */ (document.getElementById('save'));
const formMsg = /** @type {HTMLElement} */ (document.getElementById('form-msg'));
const debitTotalEl = /** @type {HTMLElement} */ (document.getElementById('debit-total'));
const creditTotalEl = /** @type {HTMLElement} */ (document.getElementById('credit-total'));
const diffEl = /** @type {HTMLElement} */ (document.getElementById('diff'));
const entriesBody = /** @type {HTMLTableSectionElement} */ (document.getElementById('entries-body'));
const entryCountEl = /** @type {HTMLElement} */ (document.getElementById('entry-count'));
const emptyMsg = /** @type {HTMLElement} */ (document.getElementById('empty-msg'));
const dateInput = /** @type {HTMLInputElement} */ (form.elements.namedItem('date'));
const descriptionInput = /** @type {HTMLInputElement} */ (form.elements.namedItem('description'));

/** @param {number} n */
const fmt = (n) => n.toLocaleString('ko-KR');

// 표시용 콤마를 걷어내고 숫자로 — 숫자가 아니면 NaN을 그대로 돌려 호출부가 판단하게 한다.
/** @param {string} s */
const parseAmount = (s) => {
  const t = s.replace(/,/g, '').trim();
  return t === '' ? 0 : Number(t);
};

/** @param {ParentNode} root @param {string} sel @returns {HTMLInputElement} */
const inputIn = (root, sel) => /** @type {HTMLInputElement} */ (root.querySelector(sel));

/** @returns {HTMLTableRowElement[]} */
const lineRows = () => /** @type {HTMLTableRowElement[]} */ ([...linesBody.querySelectorAll('tr.line')]);

// --- 전표 라인 ---

function addLine() {
  const fragment = /** @type {DocumentFragment} */ (lineTemplate.content.cloneNode(true));
  const select = /** @type {HTMLSelectElement} */ (fragment.querySelector('.account'));
  for (const a of accounts) {
    const opt = document.createElement('option');
    opt.value = a.code;
    opt.textContent = `${a.code} ${a.name}`;
    select.append(opt);
  }
  linesBody.append(fragment);
  refreshRemoveButtons();
}

// 전표는 최소 2라인 — 2개만 남으면 삭제 버튼을 잠근다.
function refreshRemoveButtons() {
  const rows = lineRows();
  for (const r of rows) {
    /** @type {HTMLButtonElement} */ (r.querySelector('.remove')).disabled = rows.length <= 2;
  }
}

function resetLines() {
  linesBody.replaceChildren();
  addLine();
  addLine();
  descriptionInput.value = '';
  recalc();
}

// --- 합계·차액 표시와 저장 버튼 활성화 ---

function recalc() {
  let debit = 0;
  let credit = 0;
  let invalid = false;
  for (const r of lineRows()) {
    const d = parseAmount(inputIn(r, '.debit').value);
    const c = parseAmount(inputIn(r, '.credit').value);
    if (!Number.isSafeInteger(d) || !Number.isSafeInteger(c) || d < 0 || c < 0) {
      invalid = true;
      continue;
    }
    debit += d;
    credit += c;
  }
  const diff = debit - credit;
  debitTotalEl.textContent = fmt(debit);
  creditTotalEl.textContent = fmt(credit);
  diffEl.textContent = fmt(Math.abs(diff));
  diffEl.classList.toggle('balanced', !invalid && diff === 0);
  diffEl.classList.toggle('unbalanced', invalid || diff !== 0);
  // 차액 0일 때만 저장 가능. 전부 0인 전표(서버도 거부)와 잘못된 입력도 잠근다.
  saveButton.disabled = invalid || diff !== 0 || debit === 0;
}

form.addEventListener('input', (e) => {
  const target = e.target;
  // 한 라인에서 차·대 한쪽에 금액을 넣으면 반대쪽을 0으로 — 서버 검증과 이중 방어
  if (target instanceof HTMLInputElement) {
    const row = target.closest('tr.line');
    if (row && parseAmount(target.value) > 0) {
      if (target.classList.contains('debit')) inputIn(row, '.credit').value = '0';
      if (target.classList.contains('credit')) inputIn(row, '.debit').value = '0';
    }
  }
  recalc();
});

// 콤마 표시는 입력이 끝난 뒤(focusout)에만 — 타이핑 중에 바꾸면 커서가 튄다.
form.addEventListener('focusout', (e) => {
  const target = e.target;
  if (target instanceof HTMLInputElement && target.classList.contains('amount')) {
    const n = parseAmount(target.value);
    if (Number.isSafeInteger(n) && n >= 0) target.value = fmt(n);
  }
});

// --- 버튼들 ---

/** @type {HTMLButtonElement} */ (document.getElementById('add-line')).addEventListener('click', () => {
  addLine();
  recalc();
});

// 마지막 라인의 금액을 "나머지 라인들의 차액"에 정확히 맞춰 채운다 — 실무 회계 프로그램 UX.
/** @type {HTMLButtonElement} */ (document.getElementById('fill-diff')).addEventListener('click', () => {
  const rows = lineRows();
  const last = rows[rows.length - 1];
  const lastDebit = inputIn(last, '.debit');
  const lastCredit = inputIn(last, '.credit');
  let rest = 0; // 마지막 라인을 제외한 (차변 - 대변)
  for (const r of rows.slice(0, -1)) {
    const d = parseAmount(inputIn(r, '.debit').value);
    const c = parseAmount(inputIn(r, '.credit').value);
    if (!Number.isSafeInteger(d) || !Number.isSafeInteger(c)) return;
    rest += d - c;
  }
  lastDebit.value = rest < 0 ? fmt(-rest) : '0';
  lastCredit.value = rest > 0 ? fmt(rest) : '0';
  recalc();
});

linesBody.addEventListener('click', (e) => {
  const target = e.target;
  if (target instanceof HTMLElement && target.classList.contains('remove')) {
    if (lineRows().length <= 2) return;
    target.closest('tr.line')?.remove();
    refreshRemoveButtons();
    recalc();
  }
});

// --- 저장 ---

/** @param {string} text @param {boolean} ok */
function showMessage(text, ok) {
  formMsg.textContent = text;
  formMsg.className = ok ? 'ok' : 'error';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const entry = {
    date: dateInput.value,
    description: descriptionInput.value,
    lines: lineRows().map((r) => ({
      accountCode: /** @type {HTMLSelectElement} */ (r.querySelector('.account')).value,
      debit: parseAmount(inputIn(r, '.debit').value),
      credit: parseAmount(inputIn(r, '.credit').value),
    })),
  };
  const res = await fetch('/api/entries', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(entry),
  });
  if (res.status === 201) {
    showMessage('저장되었습니다.', true);
    resetLines();
    await loadEntries();
  } else {
    const body = /** @type {{ errors?: string[] }} */ (await res.json().catch(() => ({})));
    showMessage(body.errors?.join(' / ') ?? `저장 실패 (HTTP ${res.status})`, false);
  }
});

// --- 전표 목록 ---

/** @param {Entry} entry 분개를 "차) … / 대) …" 한 줄로 요약 */
function summarizeLines(entry) {
  const byCode = new Map(accounts.map((a) => [a.code, a.name]));
  const side = (/** @type {'debit' | 'credit'} */ key) =>
    entry.lines
      .filter((l) => l[key] > 0)
      .map((l) => `${byCode.get(l.accountCode) ?? l.accountCode} ${fmt(l[key])}`)
      .join(', ');
  return `차) ${side('debit')} / 대) ${side('credit')}`;
}

async function loadEntries() {
  const entries = /** @type {Entry[]} */ (await (await fetch('/api/entries')).json());
  entriesBody.replaceChildren();
  for (const entry of entries) {
    const tr = document.createElement('tr');
    const total = entry.lines.reduce((s, l) => s + l.debit, 0);
    const cells = [entry.date, entry.description, summarizeLines(entry), fmt(total)];
    for (const [i, text] of cells.entries()) {
      const td = document.createElement('td');
      td.textContent = text;
      if (i === 3) td.className = 'num';
      tr.append(td);
    }
    const td = document.createElement('td');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'remove-entry';
    btn.dataset.id = entry.id;
    btn.textContent = '삭제';
    td.append(btn);
    tr.append(td);
    entriesBody.append(tr);
  }
  entryCountEl.textContent = entries.length > 0 ? `(${entries.length}건)` : '';
  emptyMsg.hidden = entries.length > 0;
}

entriesBody.addEventListener('click', async (e) => {
  const target = e.target;
  if (!(target instanceof HTMLElement) || !target.classList.contains('remove-entry')) return;
  const id = target.dataset.id;
  if (!id || !window.confirm('이 전표를 삭제할까요?')) return;
  const res = await fetch(`/api/entries/${id}`, { method: 'DELETE' });
  if (res.status === 204) await loadEntries();
});

// --- 시작 ---

async function init() {
  accounts = /** @type {Account[]} */ (await (await fetch('/api/accounts')).json());
  dateInput.value = new Date().toISOString().slice(0, 10);
  resetLines();
  await loadEntries();
}

init();
