import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell/AppShell';
import { Button } from '../../components';
import text from '../../styles/text.module.css';
import styles from './ProcessingPage.module.css';

const STEPS = [
  '입력 조건 확인',
  '평소 수면 패턴 반영',
  'Two-Process Model 계산',
  '카페인 상호작용 모델(UMP) 계산',
  '다중 시험 통합 최적화',
];

// 서비스_기술_지도.md 7.2: 실제 계산은 단일 POST 요청→응답이고, 이 단계 표시는 프론트 연출용 타이머다.
const STEP_INTERVAL_MS = 700;

export function ProcessingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentStep >= STEPS.length) {
      navigate('/result');
      return;
    }
    const timer = setTimeout(() => setCurrentStep((step) => step + 1), STEP_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [currentStep, navigate]);

  return (
    <AppShell
      title="처리 중"
      step={3}
      backTo="/input"
      footer={
        <Button to="/result" variant="primary">
          (자동 이동) 결과 화면 →
        </Button>
      }
    >
      <div className={styles.center}>
        <div className={styles.iconBox}>☕</div>
        <h1 className={text.headline}>스케줄을 계산하고 있어요</h1>
        <p className={`${text.subtext} ${styles.subtext}`}>
          시험 3개를 한 번에 고려해서
          <br />
          최적 조합을 찾는 중이에요.
        </p>

        <div className={styles.checklist}>
          {STEPS.map((label, index) => {
            const state = index < currentStep ? 'done' : index === currentStep ? 'active' : '';
            return (
              <div key={label} className={[styles.checkItem, state ? styles[state] : ''].filter(Boolean).join(' ')}>
                <span className={styles.checkDot}>{index < currentStep ? '✓' : index === currentStep ? '●' : ''}</span>
                {label}
                {index === currentStep && index < STEPS.length ? ' 중…' : ''}
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
