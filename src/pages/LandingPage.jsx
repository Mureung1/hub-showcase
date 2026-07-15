import { useNavigate } from 'react-router-dom'
import { ANALYSIS_ID_STORAGE_KEY } from '../constants/storageKeys'

// prototype/demo_11.html의 renderLandingScreen() 3단계 카드 문구를 그대로 포팅 — 정적 텍스트라 로직 없음.
const HOW_IT_WORKS = [
  {
    num: '01',
    title: '조건 필터링 & 스펙 입력',
    desc: '직종·인턴 여부와 학력·경력·자격증 스펙을 입력해요.',
  },
  {
    num: '02',
    title: '갭 분석 엔진',
    desc: '공고 요구사항과 내 스펙을 항목별로 대조해 자동 판정해요.',
  },
  {
    num: '03',
    title: '시각화 결과',
    desc: '지원 가능 비율(도넛)과 부족 역량 순위(막대)를 보여줘요.',
  },
]

function LandingPage() {
  const navigate = useNavigate()
  // #14 최소 버전: 프로토타입의 getResumeStep(필터/스펙/결과 전 단계 감지)은 만들지 않는다 —
  // 저장된 분석 id 존재 여부만 보고 /result로 보낸다. 복원 실패(오래된 id 등) 처리는
  // ResultPage가 #9에서 이미 하고 있다(상태 'no-spec' → /spec 리다이렉트).
  const hasSavedAnalysis = Boolean(localStorage.getItem(ANALYSIS_ID_STORAGE_KEY))

  return (
    <div className="screen-wide">
      {hasSavedAnalysis && (
        <div className="resume-banner">
          <span>이전에 분석한 결과가 있어요.</span>
          <button className="btn-link" onClick={() => navigate('/result')}>
            이전 분석 결과 이어보기
          </button>
        </div>
      )}

      <section className="landing-hero">
        <p className="landing-hero-eyebrow">스펙 자가진단 · 갭 분석</p>
        <h1 className="landing-hero-title">
          내 스펙으로 지금
          <br />
          지원 가능한 공고, <span className="accent">몇 개</span>일까요?
        </h1>
        <p className="landing-hero-sub">
          조건과 스펙을 입력하면, 지원 가능 비율과 부족한 역량을 바로 확인할 수 있어요.
        </p>
        <button className="btn-primary landing-hero-btn" onClick={() => navigate('/filter')}>
          갭 분석 시작하기
        </button>
      </section>

      <section className="how-it-works">
        <p className="section-label">이렇게 동작해요</p>
        <div className="how-grid">
          {HOW_IT_WORKS.map((step) => (
            <div className="how-card" key={step.num}>
              <div className="how-num mono">{step.num}</div>
              <p className="how-title">{step.title}</p>
              <p className="how-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default LandingPage
