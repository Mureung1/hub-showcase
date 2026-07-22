// 온보딩 — 회사 "거의 고정" 프로필을 최초 1회 입력해 DB에 저장한다.
// 연간 위저드와 같은 셀 엔진(useTaxInputEngine)을 토픽 순서만 바꿔 재사용.
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ONBOARDING_TOPIC_ORDER, TOPIC_META } from '../taxinput/catalog';
import { useTaxInputEngine } from '../taxinput/useEngine';
import { ActiveCell } from '../taxinput/components/ActiveCell';
import { AnsweredRow } from '../taxinput/components/AnsweredRow';
import { TopBar } from '../taxinput/components/TopBar';
import { buildProfilePayload, createCompany, ApiError } from '../taxinput/api';
import wizardStyles from '../taxinput/components/TaxInputWizard.module.css';
import styles from './pages.module.css';

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    data, cells, topicKey, frontier, editingId, canGoBack, progressPct, remainingEst, finished,
    commit, goBack, startEdit, clearDraft,
  } = useTaxInputEngine(ONBOARDING_TOPIC_ORDER, undefined, 'onboarding');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await createCompany(buildProfilePayload(data));
      clearDraft(); // 서버에 저장됐으니 로컬 임시저장은 지운다
      navigate('/', { replace: true });
    } catch (e) {
      setBusy(false);
      setError(e instanceof ApiError ? e.message
        : e instanceof TypeError ? 'API 서버에 연결할 수 없어요 (python -m taxengine.api.main).'
          : '저장에 실패했어요.');
    }
  };

  const meta = TOPIC_META[topicKey];
  const primaryCell = frontier < cells.length ? cells[frontier] : null;
  const historyReversed = cells.slice(0, Math.min(frontier, cells.length)).reverse();
  const p = buildProfilePayload(data);

  return (
    <div className={wizardStyles.root}>
      <TopBar topicKey={topicKey} topicOrder={ONBOARDING_TOPIC_ORDER} progressPct={progressPct} canGoBack={canGoBack} onBack={goBack} />

      <div className={wizardStyles.stage}>
        <div className={wizardStyles.topicCol}>
          <div className={wizardStyles.topicHead}>
            <div className={wizardStyles.eyebrow}>
              {meta?.section}
              {!finished && remainingEst > 0 && <span className={wizardStyles.remainNote}> · 약 {remainingEst}문항 남음</span>}
            </div>
            <h1 className={wizardStyles.title}>{finished ? '입력한 내용을 확인해주세요' : meta?.title}</h1>
            {!finished && typeof meta?.desc === 'string' && <p className={wizardStyles.desc}>{meta.desc}</p>}
          </div>

          {finished ? (
            <div className={styles.card}>
              <div className={styles.summaryList}>
                <div className={styles.summaryRow}><span>회사명</span><b>{p.회사명}</b></div>
                <div className={styles.summaryRow}><span>설립연도</span><b>{p.설립연도 ?? '—'}</b></div>
                <div className={styles.summaryRow}><span>중소기업</span><b>{p.중소기업 ? '해당' : '해당 없음'}</b></div>
                <div className={styles.summaryRow}><span>부동산임대업 주업</span><b>{p.부동산임대업주업 ? '예' : '아니오'}</b></div>
                <div className={styles.summaryRow}><span>상시근로자수</span><b>{p.상시근로자수 ?? '—'}명</b></div>
                <div className={styles.summaryRow}>
                  <span>지배주주</span>
                  <b>{p.지배주주목록.length ? p.지배주주목록.map((s) => `${s.명} ${s.지분율}%`).join(', ') : '—'}</b>
                </div>
              </div>
              <button type="button" className={styles.primaryBtn} onClick={submit} disabled={busy}>
                {busy ? '저장 중…' : '저장하고 시작하기'}
              </button>
              {error && <p className={styles.error}>{error}</p>}
            </div>
          ) : (
            <div className={wizardStyles.cellList}>
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
          )}
        </div>
      </div>
    </div>
  );
};
