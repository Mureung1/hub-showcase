import React, { useState } from 'react';
import styles from './YmdField.module.css';

const YEAR_MIN = 2005;
const YEAR_MAX = 2027;
const YEARS = Array.from({ length: YEAR_MAX - YEAR_MIN + 1 }, (_, i) => YEAR_MAX - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

interface YmdFieldProps {
  value: string; // "YYYY-MM-DD" or ""
  onReady: (valid: boolean, build: () => string) => void; // reports validity up so the parent's "다음" button can enable/disable + build the final string on submit
}

/** 년/월은 드롭다운, 일은 직접 입력 — 사업연도·자산 취득일 등에서 재사용. */
export const YmdField: React.FC<YmdFieldProps> = ({ value, onReady }) => {
  const [y, m, d] = value ? value.split('-') : ['', '', ''];
  const [year, setYear] = useState(y || '');
  const [month, setMonth] = useState(m ? String(Number(m)) : '');
  const [day, setDay] = useState(d ? String(Number(d)) : '');

  const dayNum = Number(day);
  const valid = !!year && !!month && !!day && dayNum >= 1 && dayNum <= 31;

  React.useEffect(() => {
    onReady(valid, () => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, day]);

  return (
    <div className={styles.row}>
      <select className={styles.select} value={year} onChange={(e) => setYear(e.target.value)} aria-label="년">
        <option value="">년</option>
        {YEARS.map((yy) => <option key={yy} value={yy}>{yy}</option>)}
      </select>
      <span className={styles.unit}>년</span>
      <select className={styles.select} value={month} onChange={(e) => setMonth(e.target.value)} aria-label="월">
        <option value="">월</option>
        {MONTHS.map((mm) => <option key={mm} value={mm}>{mm}</option>)}
      </select>
      <span className={styles.unit}>월</span>
      <input
        className={styles.day}
        type="number"
        inputMode="numeric"
        min={1}
        max={31}
        placeholder="일"
        value={day}
        onChange={(e) => setDay(e.target.value.replace(/[^\d]/g, ''))}
      />
      <span className={styles.unit}>일</span>
    </div>
  );
};
