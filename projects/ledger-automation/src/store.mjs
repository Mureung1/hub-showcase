// @ts-check
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { validateEntry } from './validate.mjs';

/**
 * @typedef {import('./validate.mjs').EntryInput} EntryInput
 * @typedef {import('./validate.mjs').EntryLine} EntryLine
 * @typedef {EntryInput & { id: string }} Entry
 */

const DEFAULT_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'entries.json');

// 테스트·시드에서 저장 위치를 바꿀 수 있도록 호출 시점에 환경변수를 읽는다.
function dataFile() {
  return process.env.LEDGER_DATA_FILE ?? DEFAULT_FILE;
}

/**
 * @param {string} [file]
 * @returns {Promise<Entry[]>}
 */
export async function loadEntries(file = dataFile()) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (err) {
    if (/** @type {NodeJS.ErrnoException} */ (err).code === 'ENOENT') return [];
    throw err;
  }
}

// 저장 중 크래시가 나도 원본 JSON이 깨지지 않도록 임시 파일에 쓴 뒤 rename으로 교체한다.
/**
 * @param {Entry[]} entries
 * @param {string} file
 */
async function saveEntries(entries, file) {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  await writeFile(tmp, JSON.stringify(entries, null, 2), 'utf8');
  await rename(tmp, file);
}

export class ValidationError extends Error {
  /** @param {string[]} errors */
  constructor(errors) {
    super(errors.join('; '));
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/**
 * @param {unknown} input validateEntry 통과 후에만 EntryInput으로 간주한다
 * @param {string} [file]
 * @returns {Promise<Entry>}
 */
export async function addEntry(input, file = dataFile()) {
  const errors = validateEntry(input);
  if (errors.length > 0) throw new ValidationError(errors);
  const valid = /** @type {EntryInput} */ (input);

  const entry = {
    id: randomUUID(),
    date: valid.date,
    description: valid.description.trim(),
    lines: valid.lines.map((l) => ({ accountCode: l.accountCode, debit: l.debit, credit: l.credit })),
  };
  const entries = await loadEntries(file);
  entries.push(entry);
  entries.sort((a, b) => a.date.localeCompare(b.date));
  await saveEntries(entries, file);
  return entry;
}

/**
 * @param {string} id
 * @param {string} [file]
 * @returns {Promise<boolean>} 삭제되면 true, 해당 id가 없으면 false
 */
export async function removeEntry(id, file = dataFile()) {
  const entries = await loadEntries(file);
  const next = entries.filter((e) => e.id !== id);
  if (next.length === entries.length) return false;
  await saveEntries(next, file);
  return true;
}
