import type { Cell } from '../engine';

export function toKRW(n: number | string | null | undefined): string {
  return Number(n || 0).toLocaleString('ko-KR');
}

export function fmtCellValue(cell: Cell): string {
  const v = cell.get();
  if (cell.kind === 'number') {
    if (v === '' || v == null) return '0';
    return toKRW(v) + (cell.money ? '원' : cell.unit || '');
  }
  if (cell.kind === 'text') return v || '-';
  if (cell.kind === 'date-ymd') return v ? String(v).replace(/-/g, '.') : '-';
  if (cell.kind === 'select') {
    const o = (cell.opts || []).find((x) => x.value === v);
    return o ? o.label : '-';
  }
  if (cell.kind === 'yesno') return v === true ? '네' : v === false ? '아니요' : '-';
  if (cell.kind === 'section-intro') return '확인함';
  if (cell.kind === 'shareholders') {
    const arr = (v || []) as { 비율: string }[];
    if (!arr.length) return '해당 없음';
    const sum = arr.reduce((s, r) => s + Number(r.비율 || 0), 0);
    return `${arr.length}명 · 합계 ${sum}%`;
  }
  return '';
}
