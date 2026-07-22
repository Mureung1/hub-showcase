import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell/AppShell';
import { Button, WarningBanner } from '../../components';
import text from '../../styles/text.module.css';
import styles from './ProcessingPage.module.css';
import { useSchedule } from '../../context/ScheduleContext';
import { calculateSchedule, type ScheduleCalculateResponse } from '../../api/calculateSchedule';

const STEPS = [
  '입력 조건 확인',
  '평소 수면 패턴 반영',
  'Two-Process Model 계산',
  '카페인 상호작용 모델(UMP) 계산',
  '다중 시험 통합 최적화',
];

// 서비스_기술_지도.md 7.2: 실제 계산은 단일 POST 요청→응답이고, 이 단계 표시는 프론트 연출용 타이머다.
// 응답이 아주 빨리 와도 연출이 깜빡이지 않도록 STEPS를 다 지나갈 때까지는 기다린다(#17).
const STEP_INTERVAL_MS = 700;

export function ProcessingPage() {
  const navigate = useNavigate();
  const { request, setResponse, setStatus, setErrorMessage } = useSchedule();

  const [currentStep, setCurrentStep] = useState(0);
  /** 서버 응답. 도착해도 연출이 끝나기 전에는 넘어가지 않으려고 여기 잠깐 들고 있는다 */
  const [result, setResult] = useState<ScheduleCalculateResponse | null>(null);
  const [failMessage, setFailMessage] = useState<string | null>(null);

  // StrictMode에서는 효과가 두 번 실행돼서 요청도 두 번 나간다. 한 번만 보내도록 표시해둔다.
  const startedRef = useRef(false);

  const 요청보내기 = useCallback(
    (payload: NonNullable<typeof request>) => {
      setStatus('loading');
      setErrorMessage(null);
      setFailMessage(null);
      setResult(null);
      setCurrentStep(0);

      calculateSchedule(payload)
        .then((res) => setResult(res))
        .catch((err: Error) => {
          setFailMessage(err.message);
          setErrorMessage(err.message);
          setStatus('error');
        });
    },
    [setStatus, setErrorMessage],
  );

  // 화면이 뜨는 순간 요청을 발사한다. 입력 없이 주소로 직접 들어온 경우는 입력 화면으로 돌려보낸다.
  useEffect(() => {
    if (request === null) {
      navigate('/input', { replace: true });
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;
    요청보내기(request);
  }, [request, navigate, 요청보내기]);

  // 단계 연출 타이머. 실패했으면 더 진행하지 않는다.
  useEffect(() => {
    if (failMessage !== null) return;
    if (currentStep >= STEPS.length) return;
    const timer = setTimeout(() => setCurrentStep((step) => step + 1), STEP_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [currentStep, failMessage]);

  // "응답 도착"과 "연출 끝" 두 조건이 모두 만족됐을 때만 결과 화면으로.
  useEffect(() => {
    if (result === null) return;
    if (currentStep < STEPS.length) return;
    setResponse(result);
    setStatus('success');
    navigate('/result');
  }, [result, currentStep, setResponse, setStatus, navigate]);

  function 다시시도() {
    if (request === null) return;
    요청보내기(request);
  }

  const 실패 = failMessage !== null;

  return (
    <AppShell
      title="처리 중"
      step={3}
      backTo="/input"
      footer={
        실패 ? (
          <>
            <Button variant="primary" onClick={다시시도}>
              다시 시도
            </Button>
            <Button to="/input" variant="secondary">
              입력으로 돌아가기
            </Button>
          </>
        ) : undefined
      }
    >
      <div className={styles.center}>
        <div className={styles.iconBox}>{실패 ? '⚠️' : '☕'}</div>

        {실패 ? (
          <>
            <h1 className={text.headline}>계산에 실패했어요</h1>
            <WarningBanner>{failMessage}</WarningBanner>
          </>
        ) : (
          <>
            <h1 className={text.headline}>스케줄을 계산하고 있어요</h1>
            <p className={`${text.subtext} ${styles.subtext}`}>
              시험 {request?.exams.length ?? 0}개를 한 번에 고려해서
              <br />
              최적 조합을 찾는 중이에요.
            </p>

            <div className={styles.checklist}>
              {STEPS.map((label, index) => {
                const state = index < currentStep ? 'done' : index === currentStep ? 'active' : '';
                return (
                  <div key={label} className={[styles.checkItem, state ? styles[state] : ''].filter(Boolean).join(' ')}>
                    <span className={styles.checkDot}>
                      {index < currentStep ? '✓' : index === currentStep ? '●' : ''}
                    </span>
                    {label}
                    {index === currentStep && index < STEPS.length ? ' 중…' : ''}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
