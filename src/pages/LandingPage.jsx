import { useNavigate } from 'react-router-dom'
import { getResumeStep, useAppState } from '../context/AppStateContext'
import DonutChart from '../components/charts/DonutChart'

const RESUME_PATH = { filter: '/filter', spec: '/spec', result: '/result' }

// prototype/demo_13.html의 renderLandingScreen()을 그대로 포팅 — 2단 히어로(카피+도넛 미리보기 카드)와
// 아이콘 배지 카드 구성 (#22). 도넛 미리보기 값(68%, 14/20건)은 실제 분석 결과가 아니라
// 데모용 고정 예시값 — 프로토타입도 동일하게 하드코딩돼 있다.
// 4번째 카드(북마크/참고링크)는 프로토타입 이후 추가된 기능이라 원본엔 없음 — 핵심 3단계 흐름은
// 그대로 두고, 로그인/북마크(#19/#20)+참고링크(#25)로 넓어진 기능 범위를 반영해 추가.
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
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4.2L5 20V5a1 1 0 0 1 1-1z" />
      </svg>
    ),
    iconClass: 'how-icon-4',
    title: '04. 북마크 & 참고링크',
    desc: '로그인하면 관심 공고를 저장해두고, 부족한 항목을 채울 수 있는 사이트로 바로 이동할 수 있어요.',
  },
]

function LandingPage() {
  const navigate = useNavigate()
  const { filters, spec, result } = useAppState()
  // #21: 필터만 선택했는지/스펙까지 입력했는지/결과까지 있는지 3단계로 판정해서, 버튼 노출 여부와
  // 이동 대상을 함께 정한다. 복원 실패(오래된 id 등) 처리는 ResultPage가 #9에서 이미 하고 있다.
  const resumeStep = getResumeStep({ filters, spec, result })

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
              {resumeStep && (
                <button className="btn-hero-secondary" onClick={() => navigate(RESUME_PATH[resumeStep])}>
                  지난 분석 이어하기
                </button>
              )}
            </div>
            <button className="btn-link hero-guide-link" onClick={() => navigate('/guide')}>
              이용 방법이 궁금하다면? →
            </button>
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
        <p className="section-sub">몇 단계만 거치면 내가 지원 가능한 공고를 정확히 알고, 관리까지 할 수 있어요.</p>
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
