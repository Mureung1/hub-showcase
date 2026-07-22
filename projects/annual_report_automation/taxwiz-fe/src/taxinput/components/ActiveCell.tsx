import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { SelectCard } from '../../components/ui/SelectCard';
import { NumberInput } from '../../components/ui/NumberInput';
import { Tooltip } from '../../components/ui/Tooltip';
import type { Cell } from '../engine';
import type { TaxInputState } from '../types';
import { GLOSSARY } from '../catalog';
import { YmdField } from './YmdField';
import { ShareholdersField } from './ShareholdersField';
import styles from './ActiveCell.module.css';

interface ActiveCellProps {
  cell: Cell;
  editing: boolean;
  primary: boolean;
  data: TaxInputState;
  onCommit: (value: any) => void;
}

const cardTransition = { duration: 0.32, ease: [0.16, 1, 0.3, 1] as const };

export const ActiveCell: React.FC<ActiveCellProps> = ({ cell, editing, primary, data, onCommit }) => {
  const [text, setText] = useState<string>(cell.kind === 'text' || cell.kind === 'number' ? (cell.get() ?? '') : '');
  const [ymdValid, setYmdValid] = useState(false);
  const ymdBuild = useRef<() => string>(() => '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cell.kind === 'text') {
      setTimeout(() => inputRef.current?.focus(), primary ? 340 : 120);
    }
  }, [cell.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectAndAdvance = (value: any) => {
    // 살짝 지연을 줘서 "선택됨" 표시가 눈에 보인 뒤 다음 질문으로 넘어가게 함 (기존 StepContainer 관례)
    setTimeout(() => onCommit(value), 120);
  };

  const helpIcon = cell.glossaryKey && GLOSSARY[cell.glossaryKey]
    ? <Tooltip content={GLOSSARY[cell.glossaryKey]} />
    : null;

  const skipValue = cell.money || cell.kind === 'number' ? '0' : '';

  let body: React.ReactNode = null;

  if (cell.kind === 'text') {
    body = (
      <div className={styles.inputRow}>
        <div className={styles.textBox}>
          <input
            ref={inputRef}
            type="text"
            placeholder={cell.ph || ''}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && text.trim() !== '') onCommit(text); }}
          />
        </div>
        <button type="button" className={styles.goBtn} disabled={text.trim() === ''} onClick={() => onCommit(text)} aria-label="다음">
          <GoIcon />
        </button>
      </div>
    );
  } else if (cell.kind === 'number') {
    const numValue = text === '' ? null : Number(text);
    body = (
      // NumberInput doesn't expose its own onKeyDown, so Enter is caught here
      // via bubbling from its internal <input> instead.
      <div className={styles.inputRow} onKeyDown={(e) => { if (e.key === 'Enter' && text.trim() !== '') onCommit(text); }}>
        <NumberInput
          value={numValue}
          onChange={(v) => setText(v == null ? '' : String(v))}
          placeholder={cell.money ? '금액을 입력하세요' : '숫자를 입력하세요'}
          unit={cell.money ? '원' : cell.unit || ''}
          min={0}
          max={cell.unit === '%' ? 100 : undefined}
          quickAmounts={cell.money ? undefined : []}
        />
        <button type="button" className={styles.goBtn} disabled={text.trim() === ''} onClick={() => onCommit(text)} aria-label="다음">
          <GoIcon />
        </button>
      </div>
    );
  } else if (cell.kind === 'date-ymd') {
    body = (
      <div className={styles.inputRow}>
        <YmdField value={cell.get() || ''} onReady={(valid, build) => { setYmdValid(valid); ymdBuild.current = build; }} />
        <button type="button" className={styles.goBtn} disabled={!ymdValid} onClick={() => onCommit(ymdBuild.current())} aria-label="다음">
          <GoIcon />
        </button>
      </div>
    );
  } else if (cell.kind === 'select') {
    const val = cell.get();
    body = (
      <div className={styles.options}>
        {(cell.opts || []).map((o) => (
          <SelectCard key={o.value} option={o} selected={val === o.value} onClick={() => selectAndAdvance(o.value)} />
        ))}
      </div>
    );
  } else if (cell.kind === 'yesno') {
    const val = cell.get();
    body = (
      <div className={styles.ynRow}>
        <button type="button" className={[styles.ynBtn, styles.ynYes, val === true ? styles.selected : ''].join(' ')} onClick={() => selectAndAdvance(true)}>네, 있어요</button>
        <button type="button" className={[styles.ynBtn, styles.ynNo, val === false ? styles.selected : ''].join(' ')} onClick={() => selectAndAdvance(false)}>아니요</button>
      </div>
    );
  } else if (cell.kind === 'shareholders') {
    body = <ShareholdersField value={cell.get() || []} onDone={(rows) => onCommit(rows)} />;
  } else if (cell.kind === 'info') {
    const c = data.company;
    const target = !!(c.성실신고확인서 || c.세액감면 || c.매출3억초과);
    body = (
      <>
        <div className={styles.infoCard}>
          <span className={[styles.badge, target ? styles.badgeAmber : styles.badgeGreen].join(' ')}>
            {target ? '외부조정 대상 추정' : '자기조정 가능 추정'}
          </span>
          <br />
          {target
            ? <>세무사 서명이 필요한 <b>&quot;세무사 전달용 초안&quot;</b> 포지셔닝을 유지해요. (법인세법 시행령 §97조의2)</>
            : <>매출 3억 미만·감면 無·준비금 無인 극소형 법인이면 <b>자기조정</b>도 가능해요 — 시장이 비어 있는 지점이에요.</>}
        </div>
        <button type="button" className={styles.goBtn} style={{ width: '100%', borderRadius: 12, marginTop: 12 }} onClick={() => onCommit(true)}>
          확인했어요
        </button>
      </>
    );
  }

  const showSkip = cell.skippable && cell.kind !== 'shareholders';

  return (
    <motion.div
      layout
      layoutId={cell.id}
      initial={false}
      transition={cardTransition}
      className={[styles.card, editing ? styles.editing : '', primary ? styles.primary : ''].join(' ')}
    >
      <div className={styles.titleRow}>
        <span className={styles.title}>{cell.title}</span>
        {helpIcon}
      </div>
      {cell.sub && <div className={styles.sub}>{cell.sub}</div>}
      <div className={styles.body}>
        {body}
        {showSkip && (
          <div className={styles.skipRow}>
            <button type="button" className={styles.skipLink} onClick={() => onCommit(skipValue)}>해당 없음 · 건너뛰기</button>
          </div>
        )}
        {cell.id === 'co_revenue' && (
          <div className={styles.helperNote}>모르면 건너뛰어도 괜찮아요 — 이 경우 추진비 한도는 나중에 직접 입력해요.</div>
        )}
      </div>
    </motion.div>
  );
};

function GoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
