import React from 'react';
import { SECTION_ORDER, TOPIC_META, TOPIC_ORDER } from '../catalog';
import styles from './TopBar.module.css';

interface TopBarProps {
  topicKey: string;
  progressPct: number;
  canGoBack: boolean;
  onBack: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ topicKey, progressPct, canGoBack, onBack }) => {
  const curSection = TOPIC_META[topicKey].section;
  const curIdx = TOPIC_ORDER.indexOf(topicKey);
  const reached = new Set<string>();
  for (let i = 0; i <= curIdx; i += 1) reached.add(TOPIC_META[TOPIC_ORDER[i]].section);

  return (
    <>
      <div className={styles.topbar}>
        <button type="button" className={styles.backBtn} disabled={!canGoBack} onClick={onBack} aria-label="이전 질문으로">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          이전
        </button>
        <div className={styles.track}><div className={styles.fill} style={{ width: `${progressPct}%` }} /></div>
        <span className={styles.pct}>{progressPct}%</span>
      </div>
      <div className={styles.strip}>
        {SECTION_ORDER.map((s) => {
          const cls = s === curSection ? styles.pillActive : reached.has(s) ? styles.pillDone : '';
          return <span key={s} className={[styles.pill, cls].join(' ')}>{s}</span>;
        })}
      </div>
    </>
  );
};
