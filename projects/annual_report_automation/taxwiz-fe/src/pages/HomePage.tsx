// 홈 — 내 회사·사업연도·계산 이력을 보여주고 연간 입력(/wizard)으로 보낸다.
// 회사가 없으면(첫 로그인) 온보딩으로 보낸다.
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
  ].filter(Boolean).join(' · ');

  return (
    <div className={styles.page}>
      <div className={styles.homeHeader}>
        <h1 className={styles.brand}>Tax<em>Wiz</em></h1>
        <button type="button" className={styles.ghostBtn} onClick={() => signOut()}>로그아웃</button>
      </div>

      <div className={styles.card}>
        <div className={styles.companyName}>{company.회사명}</div>
        {profileBits && <p className={styles.profileSummary}>{profileBits}</p>}
        {company.지배주주목록.length > 0 && (
          <p className={styles.profileSummary}>
            지배주주 {company.지배주주목록.map((s) => `${s.명} ${s.지분율}%`).join(', ')}
          </p>
        )}
      </div>

      <div className={styles.sectionTitle}>사업연도별 신고 이력</div>
      {fys.length === 0 && <p className={styles.empty}>아직 입력한 사업연도가 없어요.</p>}
      {fys.map((fy) => (
        <div key={fy.id} className={styles.fyRow}>
          <span className={styles.fyDates}>{fy.사업연도개시일} ~ {fy.사업연도종료일}</span>
          <span className={styles.fyTax}>
            {fy.최근차감납부세액 != null
              ? <><small>차감납부세액 · 계산 {fy.스냅샷수}회</small>{toKRW(fy.최근차감납부세액)}원</>
              : '아직 계산 안 함'}
          </span>
        </div>
      ))}

      <details className={styles.prepDetails}>
        <summary>시작 전 준비물 전체 보기</summary>
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
      </details>

      <div style={{ marginTop: 'var(--space-8)' }}>
        <button type="button" className={styles.primaryBtn} onClick={() => navigate('/wizard')}>
          {fys.length === 0 ? '올해 신고 입력 시작' : '신고 입력 시작 (기존 연도는 재제출로 교체돼요)'}
        </button>
      </div>
    </div>
  );
};
