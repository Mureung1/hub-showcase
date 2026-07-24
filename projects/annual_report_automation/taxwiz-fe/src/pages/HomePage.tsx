// 홈 — 내 회사·사업연도·계산 이력을 보여주고 연간 입력(/wizard)으로 보낸다.
// 회사가 없으면(첫 로그인) 온보딩으로 보낸다.
//
// 레이아웃은 DESIGN.md §9.2: 가운데 정렬된 세로 목록 하나였던 걸 카드 그리드 대시보드로 바꿨다.
// 카드를 같은 크기로 균일 배열하지 않고(§7 "AI-slop" 지적), 이번 연도 신고를 큰 카드로
// 두고 나머지를 주변에 배치해 시선 순서를 만든다.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCompany, listCompanies, listFiscalYears, listSnapshots,
  type CompanyDto, type FiscalYearListItem,
} from '../taxinput/api';
import { signOut } from '../auth/AuthContext';
import { toKRW } from '../taxinput/components/formatters';
import { SECTION_PREP } from '../taxinput/catalog';
import { HometaxLookupButton } from '../taxinput/components/HometaxLookupButton';
import styles from './pages.module.css';

interface FyWithTax extends FiscalYearListItem {
  최근차감납부세액: number | null;
  스냅샷수: number;
}

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [company, setCompany] = useState<CompanyDto | null>(null);
  const [fys, setFys] = useState<FyWithTax[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const companies = await listCompanies();
        if (cancelled) return;
        if (companies.length === 0) {
          navigate('/onboarding', { replace: true });
          return;
        }
        // 목록은 {id, 회사명} 요약만 온다 — 프로필(지배주주 등)은 상세 조회로
        const co = await getCompany(companies[0].id); // 소상공인 1인 1회사 시나리오 — 여러 개면 첫 회사
        if (cancelled) return;
        setCompany(co);
        const years = await listFiscalYears(co.id);
        const withTax = await Promise.all(years.map(async (fy) => {
          const snaps = await listSnapshots(fy.id);
          return { ...fy, 최근차감납부세액: snaps[0]?.차감납부세액 ?? null, 스냅샷수: snaps.length };
        }));
        if (cancelled) return;
        setFys(withTax.reverse()); // 최신 연도 먼저
        setState('ready');
      } catch {
        if (!cancelled) setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  if (state === 'loading') return <div className={styles.loadingWrap}>불러오는 중…</div>;
  if (state === 'error' || !company) {
    return (
      <div className={[styles.page, styles.centered].join(' ')}>
        <p className={styles.error}>데이터를 불러오지 못했어요. API 서버가 켜져 있는지 확인해주세요 (python -m taxengine.api.main).</p>
      </div>
    );
  }

  const profileBits = [
    company.설립연도 ? `${company.설립연도}년 설립` : null,
    company.중소기업 ? '중소기업' : null,
    company.부동산임대업주업 ? '부동산임대업 주업' : null,
    company.상시근로자수 != null ? `상시근로자 ${company.상시근로자수}명` : null,
  ].filter(Boolean);

  const latest = fys[0] ?? null;
  const 준비물총계 = Object.values(SECTION_PREP).reduce((n, items) => n + items.length, 0);

  return (
    <div className={styles.home}>
      {/* 정부 포털 골격의 얇은 유틸리티 바 — 위저드 TopBar와 같은 줄맞춤을 쓴다 */}
      <div className={styles.utility}>
        <span className={styles.utilBrand}>Tax<em>Wiz</em></span>
        <span className={styles.utilSpacer} />
        <button type="button" className={styles.utilBtn} onClick={() => signOut()}>로그아웃</button>
      </div>

      <div className={styles.homeInner}>
        <header className={styles.pageHead}>
          <h1 className={styles.pageTitle}>{company.회사명}</h1>
          <p className={styles.pageSub}>법인세 세무조정 · 연간 입력</p>
        </header>

        <div className={styles.grid}>
          {/* ── 주 카드: 이번 연도 신고 ── */}
          <section className={[styles.card, styles.cardPrimary].join(' ')}>
            <h2 className={styles.cardTitle}>이번 연도 신고</h2>
            {latest ? (
              <>
                <p className={styles.fyRange}>{latest.사업연도개시일} ~ {latest.사업연도종료일}</p>
                {latest.최근차감납부세액 != null ? (
                  <div className={styles.bigNum}>
                    <span className={styles.bigNumLabel}>차감납부세액</span>
                    <strong>{toKRW(latest.최근차감납부세액)}<em>원</em></strong>
                    <span className={styles.bigNumNote}>계산 {latest.스냅샷수}회</span>
                  </div>
                ) : (
                  <p className={styles.muted}>입력은 했지만 아직 계산하지 않았어요.</p>
                )}
              </>
            ) : (
              <p className={styles.muted}>아직 입력한 사업연도가 없어요. 준비물을 확인하고 시작해보세요.</p>
            )}
            <button type="button" className={styles.cardBtn} onClick={() => navigate('/wizard')}>
              {fys.length === 0 ? '올해 신고 입력 시작' : '신고 입력 이어서 하기'}
            </button>
            {fys.length > 0 && (
              <p className={styles.footnote}>같은 사업연도를 다시 제출하면 기존 입력이 교체돼요.</p>
            )}
          </section>

          {/* ── 회사 프로필 ── */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>회사 프로필</h2>
            {profileBits.length > 0 && (
              <ul className={styles.tagList}>
                {profileBits.map((b) => <li key={b}>{b}</li>)}
              </ul>
            )}
            {company.지배주주목록.length > 0 && (
              <dl className={styles.defRows}>
                <div>
                  <dt>지배주주</dt>
                  <dd>{company.지배주주목록.map((s) => `${s.명} ${s.지분율}%`).join(', ')}</dd>
                </div>
              </dl>
            )}
            <p className={styles.footnote}>한 번 저장하면 매년 확인만 하면 돼요.</p>
          </section>

          {/* ── 신고 이력 ── */}
          <section className={[styles.card, styles.cardHist].join(' ')}>
            <h2 className={styles.cardTitle}>사업연도별 신고 이력</h2>
            {fys.length === 0 ? (
              <p className={styles.muted}>아직 이력이 없어요.</p>
            ) : (
              <table className={styles.histTable}>
                <thead>
                  <tr><th>사업연도</th><th>차감납부세액</th></tr>
                </thead>
                <tbody>
                  {fys.map((fy) => (
                    <tr key={fy.id}>
                      <td>{fy.사업연도개시일} ~ {fy.사업연도종료일}</td>
                      <td className={styles.numCell}>
                        {fy.최근차감납부세액 != null
                          ? `${toKRW(fy.최근차감납부세액)}원`
                          : <span className={styles.muted}>미계산</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* ── 준비물 ── */}
          <section className={[styles.card, styles.cardPrep].join(' ')}>
            <h2 className={styles.cardTitle}>
              시작 전 준비물
              <span className={styles.countBadge}>{준비물총계}</span>
            </h2>
            <p className={styles.footnote}>머릿속에 없는 값이라 장부·서류에서 찾아야 하는 항목들이에요.</p>
            <div className={styles.prepScroll}>
              {Object.entries(SECTION_PREP).map(([section, items]) => (
                <div key={section} className={styles.prepSection}>
                  <b>{section}</b>
                  <ul>
                    {items.map((p) => (
                      <li key={p.label}>
                        {p.label}
                        {p.hint && <small> — {p.hint}</small>}
                        {p.hometaxGoal && <HometaxLookupButton goal={p.hometaxGoal} status={p.hometaxStatus} />}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
