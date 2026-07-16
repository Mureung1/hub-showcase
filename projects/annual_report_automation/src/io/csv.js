// 최소 CSV 파서 — 의존성 없음. 종이책 입력이 단순해서 이 정도로 충분하다.
// 규칙: 첫 줄 = 헤더, 쉼표 구분, 따옴표 필드 지원, # 로 시작하는 줄과 빈 줄은 주석.

import { readFileSync } from 'node:fs';

function splitLine(line) {
  const out = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/** CSV 텍스트 → 객체 배열 (헤더 기준) */
export function parse(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.trimStart().startsWith('#'));
  if (lines.length === 0) return [];
  const header = splitLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = splitLine(line);
    return Object.fromEntries(header.map((h, i) => [h, cells[i] ?? '']));
  });
}

export function parseFile(path) {
  return parse(readFileSync(path, 'utf8'));
}

/** key,value 2열 CSV → 객체. 값은 자동으로 숫자/불리언 변환. */
export function parseKeyValue(path) {
  const rows = parse(readFileSync(path, 'utf8'));
  const obj = {};
  for (const r of rows) obj[r.key] = coerce(r.value);
  return obj;
}

/** 문자열 → 숫자/불리언/문자열 자동 변환. "1,000" 같은 천단위 쉼표도 처리. */
export function coerce(v) {
  if (v === '' || v == null) return null;
  if (v === 'true') return true;
  if (v === 'false') return false;
  const num = v.replace(/,/g, '');
  if (/^-?\d+(\.\d+)?$/.test(num)) return Number(num);
  return v;
}

/** 행 배열의 특정 컬럼을 숫자로 합산 */
export function sum(rows, col) {
  return rows.reduce((s, r) => s + (Number(String(r[col]).replace(/,/g, '')) || 0), 0);
}
