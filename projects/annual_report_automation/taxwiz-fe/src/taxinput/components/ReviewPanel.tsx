import React, { useState } from 'react';
import { BS_GROUPS, IS_GROUPS, resolveCore } from '../catalog';
import { bsSumKind, isSumKind } from '../engine';
import type { TaxInputState } from '../types';
import { toKRW } from './formatters';
import {
  buildCompanyCsv, buildBalanceSheetCsv, buildIncomeStatementCsv, buildAssetsCsv,
  buildCarsCsv, buildAdjustmentsCsv, buildAnswerCsv, downloadCsv,
} from '../csv';
import { submitAndCalculate, ApiError, type CalcResult, type CompanyDto } from '../api';
import styles from './ReviewPanel.module.css';

interface ReviewPanelProps {
  data: TaxInputState;
  company: CompanyDto;
  onToast: (msg: string) => void;
  /** 계산(=서버 저장) 성공 시 — 위저드가 localStorage 임시저장을 지우는 데 쓴다 */
  onCalculated?: () => void;
}

type CalcStatus =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; result: CalcResult }
  | { kind: 'error'; message: string; checks?: { name: string; ok: boolean; detail: string }[] };

export const ReviewPanel: React.FC<ReviewPanelProps> = ({ data, company, onToast, onCalculated }) => {
  const [calc, setCalc] = useState<CalcStatus>({ kind: 'idle' });

  const runCalculate = async () => {
    setCalc({ kind: 'loading' });
    try {
      const result = await submitAndCalculate(company.id, data);
      setCalc({ kind: 'done', result });
      onCalculated?.(); // 서버에 저장됐으니 로컬 임시저장은 지운다
    } catch (e) {
      if (e instanceof ApiError) {
        setCalc({ kind: 'error', message: e.message, checks: e.checks });
      } else if (e instanceof TypeError) {
        // fetch throws a bare TypeError when the server isn't reachable at all
        setCalc({ kind: 'error', message: 'API 서버에 연결할 수 없어요. taxengine API가 켜져 있는지 확인해주세요 (python -m taxengine.api.main).' });
      } else {
        setCalc({ kind: 'error', message: e instanceof Error ? e.message : '알 수 없는 오류가 발생했어요.' });
      }
    }
  };

  const isRental = data.company.부동산임대업주업 === true;
  const bsA = bsSumKind(data, '자산');
  const bsAm = bsSumKind(data, '자산차감');
  const bsL = bsSumKind(data, '부채');
  const bsE = bsSumKind(data, '자본');
  const L = bsA - bsAm;
  const R = bsL + bsE;
  const rev = isSumKind(data, '수익');
  const cost = isSumKind(data, '비용');
  const bsOk = L === R && (L !== 0 || R !== 0);
  const isOk = rev > 0;

  const bsCount = BS_GROUPS.reduce((n, g) => n + resolveCore(g, isRental).filter((a) => Number(data.bs[a] || 0) !== 0).length, 0)
    + Object.keys(data.bsExtra).reduce((n, k) => n + data.bsExtra[k].length, 0);
  const isCount = IS_GROUPS.reduce((n, g) => n + resolveCore(g, isRental).filter((a) => Number(data.is[a] || 0) !== 0).length, 0)
    + Object.keys(data.isExtra).reduce((n, k) => n + data.isExtra[k].length, 0);

  const exports: [string, () => string][] = [
    ['company.csv', () => buildCompanyCsv(data)],
    ['balance_sheet.csv', () => buildBalanceSheetCsv(data)],
    ['income_statement.csv', () => buildIncomeStatementCsv(data)],
    ['assets.csv', () => buildAssetsCsv(data)],
    ['cars.csv', () => buildCarsCsv(data)],
    ['adjustments.csv', () => buildAdjustmentsCsv(data)],
    ['answer.csv (선택)', () => buildAnswerCsv()],
  ];

  return (
    <div>
      <div className={styles.statGrid}>
        <StatCard label="재무상태표 과목" num={`${bsCount}건`} />
        <StatCard label="손익계산서 과목" num={`${isCount}건`} />
        <StatCard label="자산" num={`${data.assets.length}건`} />
        <StatCard label="세무조정" num={`${data.adjustments.length}건`} />
      </div>

      <div className={styles.checkList}>
        <CheckRow ok={bsOk} title="재무상태표 대차평형" detail={`자산−자산차감 = 부채+자본 · 차이 ${toKRW(L - R)}원`} />
        <CheckRow ok={isOk} title="손익계산서 합계 정상" detail={`당기순이익 ${toKRW(rev - cost)}원`} />
        <CheckRow ok={data.assets.length > 0} title="자산대장 입력 여부" detail={`${data.assets.length}건 등록됨`} />
      </div>

      <div className={styles.calcCard}>
        <div className={styles.calcHead}>
          <b>세무조정·세액 계산</b>
          <span>{company.회사명}의 사업연도로 저장하고 바로 계산해요. 같은 연도를 다시 제출하면 입력이 교체되고 계산 이력은 쌓여요.</span>
        </div>
        <button type="button" className={styles.calcBtn} onClick={runCalculate} disabled={calc.kind === 'loading'}>
          {calc.kind === 'loading' ? '계산 중…' : '세액 계산하기'}
        </button>

        {calc.kind === 'done' && (
          <div className={styles.resultGrid}>
            <ResultRow label="각사업연도소득" value={calc.result.각사업연도소득} />
            <ResultRow label="과세표준" value={calc.result.과세표준} />
            <ResultRow label="산출세액" value={calc.result.산출세액} />
            <ResultRow label="차감납부세액" value={calc.result.차감납부세액} highlight />
            <ResultRow label="총납부세액" value={calc.result.총납부세액} />
          </div>
        )}

        {calc.kind === 'error' && (
          <div className={styles.calcError}>
            <p>{calc.message}</p>
            {calc.checks && calc.checks.length > 0 && (
              <ul>
                {calc.checks.map((c) => <li key={c.name}>{c.name} — {c.detail}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>

      <p className={styles.exportLabel}>CSV로 내보내기 (참고용 — data/private/&lt;사업연도&gt;/ 에 두면 기존 CLI로도 계산돼요)</p>
      <div className={styles.exportGrid}>
        {exports.map(([fname, build]) => (
          <div className={styles.exportItem} key={fname}>
            <span className={styles.fname}>{fname}</span>
            <button
              type="button"
              onClick={() => {
                downloadCsv(fname.replace(' (선택)', ''), build());
                onToast(`${fname} 다운로드됐어요`);
              }}
            >
              다운로드
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const ResultRow: React.FC<{ label: string; value: number; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className={[styles.resultRow, highlight ? styles.resultHighlight : ''].join(' ')}>
    <span>{label}</span>
    <span className={styles.resultNum}>{toKRW(value)}원</span>
  </div>
);

const StatCard: React.FC<{ label: string; num: string }> = ({ label, num }) => (
  <div className={styles.statCard}>
    <span className={styles.statLabel}>{label}</span>
    <span className={styles.statNum}>{num}</span>
  </div>
);

const CheckRow: React.FC<{ ok: boolean; title: string; detail: string }> = ({ ok, title, detail }) => (
  <div className={[styles.checkRow, ok ? styles.ok : styles.bad].join(' ')}>
    <span className={styles.ic}>{ok ? '✓' : '!'}</span>
    <span className={styles.checkTxt}>{title}<small>{detail}</small></span>
  </div>
);
