// @ts-check
import { getAccount } from './accounts.mjs';

/**
 * @typedef {{ accountCode: string, debit: number, credit: number }} EntryLine
 * @typedef {{ date: string, description: string, lines: EntryLine[] }} EntryInput
 */

// 전표 1건을 검증해 오류 메시지 배열을 반환한다. 빈 배열이면 유효한 전표다.
// 규칙: 라인 2개 이상 / 라인마다 차·대 중 한쪽만 양수 / 금액은 0 이상의 원 단위 정수 / 전표 전체 차변 합계 = 대변 합계
/**
 * @param {unknown} entry HTTP 등 신뢰할 수 없는 입력이므로 unknown으로 받아 런타임에 좁힌다
 * @returns {string[]}
 */
export function validateEntry(entry) {
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
    return ['전표는 객체여야 합니다'];
  }
  const { date, description, lines } = /** @type {Record<string, unknown>} */ (entry);

  const errors = [];

  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
    errors.push('날짜는 YYYY-MM-DD 형식이어야 합니다');
  }
  if (typeof description !== 'string' || description.trim() === '') {
    errors.push('적요를 입력해야 합니다');
  }

  if (!Array.isArray(lines) || lines.length < 2) {
    errors.push('전표 라인은 2개 이상이어야 합니다');
    return errors;
  }

  let debitTotal = 0;
  let creditTotal = 0;
  let amountsValid = true;

  lines.forEach((line, i) => {
    const label = `${i + 1}번 라인`;
    if (line === null || typeof line !== 'object') {
      errors.push(`${label}: 라인은 객체여야 합니다`);
      amountsValid = false;
      return;
    }
    if (!getAccount(line.accountCode)) {
      errors.push(`${label}: 등록되지 않은 계정코드입니다 (${line.accountCode})`);
    }

    const { debit, credit } = line;
    const debitOk = Number.isSafeInteger(debit) && debit >= 0;
    const creditOk = Number.isSafeInteger(credit) && credit >= 0;
    if (!debitOk) errors.push(`${label}: 차변 금액은 0 이상의 원 단위 정수여야 합니다`);
    if (!creditOk) errors.push(`${label}: 대변 금액은 0 이상의 원 단위 정수여야 합니다`);
    if (!debitOk || !creditOk) {
      amountsValid = false;
      return;
    }

    if (debit > 0 && credit > 0) errors.push(`${label}: 차변과 대변 중 한쪽에만 금액을 입력해야 합니다`);
    if (debit === 0 && credit === 0) errors.push(`${label}: 차변 또는 대변에 금액이 있어야 합니다`);
    debitTotal += debit;
    creditTotal += credit;
  });

  if (amountsValid && debitTotal !== creditTotal) {
    errors.push(`차변 합계(${debitTotal.toLocaleString('ko-KR')})와 대변 합계(${creditTotal.toLocaleString('ko-KR')})가 일치하지 않습니다`);
  }

  return errors;
}
