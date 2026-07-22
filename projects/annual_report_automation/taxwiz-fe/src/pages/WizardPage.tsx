// 연간 입력 위저드 페이지 — 저장된 회사 프로필을 불러와 TaxInputWizard에 넘긴다.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCompany, listCompanies, type CompanyDto } from '../taxinput/api';
import { TaxInputWizard } from '../taxinput/components/TaxInputWizard';
import styles from './pages.module.css';

export const WizardPage: React.FC = () => {
  const navigate = useNavigate();
  const [company, setCompany] = useState<CompanyDto | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listCompanies()
      .then(async (companies) => {
        if (cancelled) return;
        if (companies.length === 0) navigate('/onboarding', { replace: true });
        else {
          // 목록은 {id, 회사명} 요약만 — 위저드 프리필에 필요한 전체 프로필은 상세 조회로
          const co = await getCompany(companies[0].id);
          if (!cancelled) setCompany(co);
        }
      })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [navigate]);

  if (error) {
    return (
      <div className={[styles.page, styles.centered].join(' ')}>
        <p className={styles.error}>회사 정보를 불러오지 못했어요. API 서버가 켜져 있는지 확인해주세요.</p>
      </div>
    );
  }
  if (!company) return <div className={styles.loadingWrap}>불러오는 중…</div>;
  return <TaxInputWizard company={company} onExit={() => navigate('/')} />;
};
