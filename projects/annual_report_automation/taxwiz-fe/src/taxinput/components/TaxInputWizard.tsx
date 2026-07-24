import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ANNUAL_TOPIC_ORDER, TOPIC_META } from '../catalog';
import { bsSumKind, isSumKind } from '../engine';
import { useTaxInputEngine } from '../useEngine';
import type { TaxInputState } from '../types';
import type { CompanyDto } from '../api';
import { toKRW } from './formatters';
import { TopBar } from './TopBar';
import { ActiveCell } from './ActiveCell';
import { AnsweredRow } from './AnsweredRow';
import { ReviewPanel } from './ReviewPanel';
import styles from './TaxInputWizard.module.css';

interface TaxInputWizardProps {
  /** 홈에서 선택한 회사 — 저장된 프로필을 위저드 상태에 미리 채운다 */
  company: CompanyDto;
  /** 위저드를 닫고 홈으로 (TopBar ✕ 버튼) */
  onExit?: () => void;
}

export const TaxInputWizard: React.FC<TaxInputWizardProps> = ({ company, onExit }) => {
  // 저장된 프로필 → 위저드 초기 상태 (profile-confirm 요약과 제출 페이로드가 이 값을 쓴다)
  const init = useCallback((base: TaxInputState): TaxInputState => ({
    ...base,
    fy: { ...base.fy, companyName: company.회사명 },
    company: {
      ...base.company,
      설립연도: company.설립연도 == null ? '' : String(company.설립연도),
      중소기업: company.중소기업,
      부동산임대업주업: company.부동산임대업주업,
      상시근로자수: company.상시근로자수 == null ? '' : String(company.상시근로자수),
      지배주주목록: company.지배주주목록.map((s) => ({ 명: s.명, 비율: String(s.지분율) })),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [company.id]);

  const {
    data, cells, topicKey, frontier, editingId, canGoBack, progressPct, remainingEst,
    restoredFromDraft, commit, goBack, startEdit, clearDraft,
  } = useTaxInputEngine(ANNUAL_TOPIC_ORDER, init, `annual:${company.id}`);

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    window.clearTimeout((showToast as any)._t);
    (showToast as any)._t = window.setTimeout(() => setToast(null), 2000);
  };

  useEffect(() => {
    if (restoredFromDraft) showToast('작성하던 입력을 이어서 보여드려요');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoredFromDraft]);

  useEffect(() => {
    if (topicKey !== 'review') window.scrollTo({ top: 0, behavior: 'auto' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicKey]);

  const meta = TOPIC_META[topicKey];
  const isRental = data.company.부동산임대업주업 === true;
  const descText = typeof meta?.desc === 'function' ? meta.desc(isRental) : meta?.desc;

  const primaryCell = frontier < cells.length ? cells[frontier] : null;
  const historyReversed = cells.slice(0, Math.min(frontier, cells.length)).reverse();

  const showStatusBar = topicKey.startsWith('bs:') || topicKey.startsWith('is:');

  return (
    <div className={styles.root}>
      <TopBar topicKey={topicKey} progressPct={progressPct} canGoBack={canGoBack} onBack={goBack} onExit={onExit} remainingEst={remainingEst} />

      <div className={styles.stage}>
        {/* "wait" keeps exactly one topicCol mounted at a time (no absolute
            positioning needed to avoid layout overlap) — kept fast on both
            ends so 17 sequential topic swaps don't feel sluggish. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={topicKey}
            className={styles.topicCol}
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0, transition: { duration: 0.26, ease: [0.16, 1, 0.3, 1] } }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
          >
            {topicKey === 'review' ? (
              <>
                <div className={styles.topicHead}>
                  <div className={styles.eyebrow}>검토</div>
                  <h1 className={styles.title}>입력을 다 마쳤어요</h1>
                  <p className={styles.desc}>검증하고 taxengine이 바로 읽는 CSV로 내보낼 수 있어요.</p>
                </div>
                <ReviewPanel data={data} company={company} onToast={showToast} onCalculated={clearDraft} />
              </>
            ) : (
              <>
                <div className={styles.topicHead}>
                  <div className={styles.eyebrow}>
                    {meta?.section}
                    {remainingEst > 0 && <span className={styles.remainNote}> · 약 {remainingEst}문항 남음</span>}
                  </div>
                  <h1 className={styles.title}>{meta?.title}</h1>
                  {descText && <p className={styles.desc}>{descText}</p>}
                </div>

                <div className={styles.cellList}>
                  {primaryCell && (
                    <ActiveCell
                      key={primaryCell.id}
                      cell={primaryCell}
                      editing={false}
                      primary
                      data={data}
                      onCommit={(v) => commit(primaryCell, v)}
                    />
                  )}
                  <AnimatePresence initial={false}>
                    {historyReversed.map((cell) => (
                      editingId === cell.id ? (
                        <ActiveCell key={cell.id} cell={cell} editing primary={false} data={data} onCommit={(v) => commit(cell, v)} />
                      ) : (
                        <AnsweredRow key={cell.id} cell={cell} onEdit={startEdit} />
                      )
                    ))}
                  </AnimatePresence>
                </div>

                {showStatusBar && <StatusBar topicKey={topicKey} data={data} />}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
};

const StatusBar: React.FC<{ topicKey: string; data: TaxInputState }> = ({ topicKey, data }) => {
  if (topicKey.startsWith('bs:')) {
    const a = bsSumKind(data, '자산');
    const am = bsSumKind(data, '자산차감');
    const l = bsSumKind(data, '부채');
    const e = bsSumKind(data, '자본');
    const L = a - am;
    const R = l + e;
    return (
      <div className={styles.statusBar}>
        <div className={[styles.statusItem, L === R ? styles.ok : styles.bad].join(' ')}>
          <span className={styles.dot} />
          대차평형 <span className={styles.num}>{toKRW(L)}</span> = <span className={styles.num}>{toKRW(R)}</span> 원
        </div>
      </div>
    );
  }
  const rev = isSumKind(data, '수익');
  const cost = isSumKind(data, '비용');
  return (
    <div className={styles.statusBar}>
      <div className={[styles.statusItem, styles.ok].join(' ')}>
        <span className={styles.dot} />
        수익 <span className={styles.num}>{toKRW(rev)}</span>
      </div>
      <div className={styles.sep} />
      <div className={[styles.statusItem, rev - cost >= 0 ? styles.ok : styles.bad].join(' ')}>
        <span className={styles.dot} />
        당기순이익 <span className={styles.num}>{toKRW(rev - cost)}</span> 원
      </div>
    </div>
  );
};
