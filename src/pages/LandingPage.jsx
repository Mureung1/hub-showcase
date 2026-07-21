import { useNavigate } from 'react-router-dom'
import { ANALYSIS_ID_STORAGE_KEY } from '../constants/storageKeys'
import DonutChart from '../components/charts/DonutChart'

// prototype/demo_13.html의 renderLandingScreen()을 그대로 포팅 — 2단 히어로(카피+도넛 미리보기 카드)와
// 아이콘 배지 3단계 카드 구성 (#22). 도넛 미리보기 값(68%, 14/20건)은 실제 분석 결과가 아니라
// 데모용 고정 예시값 — 프로토타입도 동일하게 하드코딩돼 있다.
const HOW_IT_WORKS = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16l-6.5 8.2V19l-3 1.6v-8.4L4 4z" />
      </svg>
    ),
    iconClass: 'how-icon-1',
    title: '01. 조건 필터링 & 스펙 입력',
    desc: '직종·인턴 여부와 학력·경력·자격증 스펙을 입력해요.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="3.5" width="14" height="17" rx="2" />
        <path d="M9 12.5l2 2 4-4.5" />
      </svg>
    ),
    iconClass: 'how-icon-2',
    title: '02. 갭 분석 엔진',
    desc: '공고 요구사항과 내 스펙을 항목별로 대조해 자동 판정해요.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20V11M12 20V4M20 20v-6.5" />
      </svg>
    ),
    iconClass: 'how-icon-3',
    title: '03. 시각화 결과',
    desc: '지원 가능 비율(도넛)과 부족 역량 순위(막대)를 보여줘요.',
  },
]

function LandingPage() {
  const navigate = useNavigate()
  // #14 최소 버전: 프로토타입의 getResumeStep(필터/스펙/결과 전 단계 감지)은 만들지 않는다 —
  // 저장된 분석 id 존재 여부만 보고 /result로 보낸다. 복원 실패(오래된 id 등) 처리는
  // ResultPage가 #9에서 이미 하고 있다(상태 'no-spec' → /spec 리다이렉트).
  // (참고: getResumeStep의 3단계 감지 자체는 #21 스코프 — 이 버튼이 그 결과를 쓰게 될 예정이다.)
  const hasSavedAnalysis = Boolean(localStorage.getItem(ANALYSIS_ID_STORAGE_KEY))

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <p className="hero-eyebrow">⚡ 스펙 자가진단 · 갭 분석</p>
            <h1 className="hero-title">
              내 스펙으로 지금
              <br />
              지원 가능한 공고, <span className="accent">몇 개</span>일까요?
            </h1>
            <p className="hero-sub">
              조건과 스펙을 입력하면, 지원 가능 비율과 부족한 역량을 바로 확인할 수 있어요.
            </p>
            <div className="hero-btn-row">
              <button className="btn-hero" onClick={() => navigate('/filter')}>
                갭 분석 시작하기
              </button>
              {hasSavedAnalysis && (
                <button className="btn-hero-secondary" onClick={() => navigate('/result')}>
                  지난 분석 이어하기
                </button>
              )}
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <p className="hero-visual-eyebrow">PREVIEW · 분석 결과 예시</p>
            <DonutChart ratio={0.68} matched={14} total={20} />
            <div className="legend">
              <span>
                <span className="dot" style={{ background: 'var(--donut-ok)' }} />
                지원 가능
              </span>
              <span>
                <span className="dot" style={{ background: 'var(--donut-no)' }} />
                지원 불가
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="how-it-works">
        <p className="section-label">이렇게 동작해요</p>
        <p className="section-sub">3단계만 거치면 내가 지원 가능한 공고를 정확히 알 수 있어요.</p>
        <div className="how-grid">
          {HOW_IT_WORKS.map((step) => (
            <div className="how-card" key={step.title}>
              <div className={`how-icon ${step.iconClass}`}>{step.icon}</div>
              <p className="how-title">{step.title}</p>
              <p className="how-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

export default LandingPage
