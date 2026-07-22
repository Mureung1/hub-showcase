import React, { useMemo } from 'react';
import { ANNUAL_TOPIC_ORDER, TOPIC_META } from '../catalog';
import styles from './TopBar.module.css';

interface TopBarProps {
  topicKey: string;
  progressPct: number;
  canGoBack: boolean;
  onBack: () => void;
  /** 이 위저드가 진행하는 토픽 순서 — 섹션 pill을 여기서 계산한다 (기본: 연간 입력) */
  topicOrder?: string[];
  /** 더 갈 "이전"이 없을 때(첫 질문) 이전 버튼이 이걸 호출한다 — 위저드에서 홈으로 나가는 길 */
  onExit?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ topicKey, progressPct, canGoBack, onBack, topicOrder = ANNUAL_TOPIC_ORDER, onExit }) => {
  const sections = useMemo(
    () => [...new Set(topicOrder.map((k) => TOPIC_META[k].section))],
    [topicOrder],
  );
  const curSection = TOPIC_META[topicKey].section;
  const curIdx = topicOrder.indexOf(topicKey);
  const reached = new Set<string>();
  for (let i = 0; i <= curIdx; i += 1) reached.add(TOPIC_META[topicOrder[i]].section);

  return (
    <>
      <div className={styles.topbar}>
        <button
          type="button"
          className={styles.backBtn}
          disabled={!canGoBack && !onExit}
          onClick={canGoBack ? onBack : onExit}
          aria-label={canGoBack ? '이전 질문으로' : '홈으로 나가기'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {canGoBack ? '이전' : '홈으로'}
        </button>
        <div className={styles.track}><div className={styles.fill} style={{ width: `${progressPct}%` }} /></div>
        <span className={styles.pct}>{progressPct}%</span>
      </div>
      <div className={styles.strip}>
        {sections.map((s) => {
          const cls = s === curSection ? styles.pillActive : reached.has(s) ? styles.pillDone : '';
          return <span key={s} className={[styles.pill, cls].join(' ')}>{s}</span>;
        })}
      </div>
    </>
  );
};
