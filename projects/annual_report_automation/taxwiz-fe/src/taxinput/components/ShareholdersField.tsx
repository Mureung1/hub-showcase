import React, { useState } from 'react';
import type { Shareholder } from '../types';
import { shareholderSum } from '../engine';
import styles from './ShareholdersField.module.css';

interface ShareholdersFieldProps {
  value: Shareholder[];
  onDone: (rows: Shareholder[]) => void;
}

/** "누구는 몇%, 누구는 몇%" — 지배주주 지분율을 사람 단위로 입력받고, 합계 100% 초과는 막는다. */
export const ShareholdersField: React.FC<ShareholdersFieldProps> = ({ value, onDone }) => {
  const [rows, setRows] = useState<Shareholder[]>(value.length ? value : [{ 명: '', 비율: '' }]);
  const sum = shareholderSum(rows);
  const over = sum > 100;

  const update = (idx: number, field: keyof Shareholder, v: string) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: v } : r)));
  };

  return (
    <div>
      <div className={styles.list}>
        {rows.map((r, idx) => (
          <div className={styles.row} key={idx}>
            <input
              className={styles.name}
              type="text"
              placeholder="예: 대표A"
              value={r.명}
              onChange={(e) => update(idx, '명', e.target.value)}
            />
            <input
              className={styles.pct}
              type="number"
              min={0}
              max={100}
              placeholder="0"
              value={r.비율}
              onChange={(e) => update(idx, '비율', e.target.value.replace(/[^\d]/g, ''))}
            />
            <span className={styles.unit}>%</span>
            {rows.length > 1 ? (
              <button type="button" className={styles.del} onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))}>✕</button>
            ) : (
              <span className={styles.delSpacer} />
            )}
          </div>
        ))}
      </div>

      <div className={styles.foot}>
        <button type="button" className={styles.add} onClick={() => setRows((prev) => [...prev, { 명: '', 비율: '' }])}>+ 주주 추가</button>
        <span className={[styles.sum, over ? styles.over : ''].join(' ')}>합계 <b>{sum}%</b></span>
      </div>
      {over && <div className={styles.warn}>지분 합계가 100%를 넘을 수 없어요 — 값을 다시 확인해주세요.</div>}

      <div className={styles.doneRow}>
        <button
          type="button"
          className={styles.done}
          disabled={over}
          onClick={() => onDone(rows.filter((r) => r.명.trim() !== '' || Number(r.비율 || 0) > 0))}
        >
          확인했어요 · 다음
        </button>
      </div>
    </div>
  );
};
