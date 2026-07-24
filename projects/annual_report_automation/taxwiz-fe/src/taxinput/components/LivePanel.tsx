// 위저드 우측 실시간 패널 (DESIGN.md §9.1) — 진행률 + 잔여 문항 + 대차평형 체크.
// 대차평형은 §8.2에 따라 "구석의 조용한 상태줄"이 아니라 이 패널의 주인공으로 다룬다:
// 어긋나면 색·크기·문구가 한꺼번에 커진다. 반대로 아직 아무것도 안 적었을 때
// 0 = 0을 "정상"이라고 보여주면 거짓 안심을 주므로, 그 구간은 별도 상태로 표시한다.
import React from 'react';
import { bsSumKind, isSumKind } from '../engine';
import type { TaxInputState } from '../types';
import { toKRW } from './formatters';
import styles from './LivePanel.module.css';

interface LivePanelProps {
  data: TaxInputState;
  progressPct: number;
  /** 잔여 문항 추정치 — 0 이하이면 표시하지 않는다 */
  remainingEst?: number;
}

export const LivePanel: React.FC<LivePanelProps> = ({ data, progressPct, remainingEst }) => {
  const 자산 = bsSumKind(data, '자산') - bsSumKind(data, '자산차감');
  const 부채자본 = bsSumKind(data, '부채') + bsSumKind(data, '자본');
  const 수익 = isSumKind(data, '수익');
  const 비용 = isSumKind(data, '비용');
  const 당기순이익 = 수익 - 비용;

  const 미입력 = 자산 === 0 && 부채자본 === 0;
  const 균형 = 자산 === 부채자본;
  const 차액 = 자산 - 부채자본;

  return (
    <aside className={styles.panel} aria-label="입력 현황">
      <section className={styles.block}>
        <div className={styles.blockHead}>
          <span className={styles.blockName}>진행률</span>
          <span className={styles.pct}>{progressPct}%</span>
        </div>
        <div className={styles.track}><div className={styles.fill} style={{ width: `${progressPct}%` }} /></div>
        {remainingEst != null && remainingEst > 0 && (
          <p className={styles.note}>약 {remainingEst}문항 남음</p>
        )}
      </section>

      <section
        className={[styles.block, styles.balance, 미입력 ? styles.idle : 균형 ? styles.ok : styles.bad].join(' ')}
        aria-live="polite"
      >
        <div className={styles.blockHead}>
          <span className={styles.blockName}>대차평형</span>
          <span className={styles.verdict}>
            {미입력 ? '입력 전' : 균형 ? '맞아요' : '안 맞아요'}
          </span>
        </div>

        <dl className={styles.rows}>
          <div className={styles.row}>
            <dt>자산</dt>
            <dd>{toKRW(자산)}</dd>
          </div>
          <div className={styles.row}>
            <dt>부채 + 자본</dt>
            <dd>{toKRW(부채자본)}</dd>
          </div>
        </dl>

        {미입력 ? (
          <p className={styles.note}>재무상태표를 적기 시작하면 여기서 실시간으로 검산해요.</p>
        ) : 균형 ? (
          <p className={styles.note}>양쪽 합계가 같아요.</p>
        ) : (
          <p className={styles.alert}>
            <b>{toKRW(Math.abs(차액))}원</b> 만큼 {차액 > 0 ? '자산이 많아요' : '부채+자본이 많아요'}.
            빠뜨린 과목이 없는지 확인해주세요.
          </p>
        )}
      </section>

      <section className={styles.block}>
        <div className={styles.blockHead}>
          <span className={styles.blockName}>손익</span>
        </div>
        <dl className={styles.rows}>
          <div className={styles.row}>
            <dt>수익</dt>
            <dd>{toKRW(수익)}</dd>
          </div>
          <div className={styles.row}>
            <dt>비용</dt>
            <dd>{toKRW(비용)}</dd>
          </div>
          <div className={[styles.row, styles.rowTotal, 당기순이익 < 0 ? styles.negative : ''].join(' ')}>
            <dt>당기순이익</dt>
            <dd>{toKRW(당기순이익)}</dd>
          </div>
        </dl>
      </section>
    </aside>
  );
};
