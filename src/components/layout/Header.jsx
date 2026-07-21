import { Fragment } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '../../hooks/useTheme'
import {
  DEFAULT_FILTERS,
  DEFAULT_SPEC,
  getResumeStep,
  useAppState,
} from '../../context/AppStateContext'
import { useAuth } from '../../context/AuthContext'
import { ANALYSIS_ID_STORAGE_KEY } from '../../constants/storageKeys'

// prototype/demo_13.html의 renderHeaderBar()/renderStepperInline()을 그대로 포팅 (#21).
// #22에서 만든 최소 버전(로고+다크모드 토글)을 스테퍼+홈+초기화 버튼까지 확장한다.
const SUN_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2.2M12 19.8V22M4.93 4.93l1.55 1.55M17.52 17.52l1.55 1.55M2 12h2.2M19.8 12H22M4.93 19.07l1.55-1.55M17.52 6.48l1.55-1.55" />
  </svg>
)

const MOON_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
  </svg>
)

const STEPPER_STEPS = [
  { path: '/filter', num: 1, label: '조건 필터링' },
  { path: '/spec', num: 2, label: '스펙 입력' },
  { path: '/result', num: 3, label: '갭 분석 결과' },
]

const STEP_RANK = { filter: 1, spec: 2, result: 3 }

function StepperInline({ currentRank, maxReached, navigate }) {
  return (
    <div className="stepper-inline">
      {STEPPER_STEPS.map((step, i) => {
        const isActive = step.num === currentRank
        const isDone = step.num < currentRank
        const isClickable = step.num <= maxReached
        return (
          <Fragment key={step.path}>
            <div
              className={`step-item${isActive ? ' active' : ''}${isDone ? ' done' : ''}${isClickable ? ' clickable' : ''}`}
              onClick={isClickable ? () => navigate(step.path) : undefined}
            >
              <span className="step-circle mono">{isDone ? '✓' : step.num}</span>
              <span className="step-label">{step.label}</span>
            </div>
            {i < STEPPER_STEPS.length - 1 && <div className={`step-line${isDone ? ' done' : ''}`} />}
          </Fragment>
        )
      })}
    </div>
  )
}

function Header() {
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const { filters, spec, result, setFilters, setSpec, setResult } = useAppState()
  const { user, loading: authLoading, signOut } = useAuth()
  const isDark = theme === 'dark'

  const showStepper = ['/filter', '/spec', '/result'].includes(location.pathname)
  const currentRank = STEPPER_STEPS.find((s) => s.path === location.pathname)?.num ?? 0
  // 완료된(=클릭해서 다시 갈 수 있는) 단계는 "지금 보고 있는 화면"이 아니라 실제로 저장된 진행 상태
  // 기준으로 판단한다 — 예를 들어 스펙 페이지에 있어도 아직 필터만 선택한 상태면 결과 단계는 못 간다.
  const maxReached = Math.max(1, STEP_RANK[getResumeStep({ filters, spec, result })] ?? 1)

  function resetAll() {
    setFilters(DEFAULT_FILTERS)
    setSpec(DEFAULT_SPEC)
    setResult(null)
    localStorage.removeItem(ANALYSIS_ID_STORAGE_KEY)
    navigate('/')
  }

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="logo" to="/">
          <span className="logo-mark">S</span>
          <span className="logo-text">SpecFit</span>
        </Link>
        {showStepper ? (
          <StepperInline currentRank={currentRank} maxReached={maxReached} navigate={navigate} />
        ) : (
          <div className="header-spacer" />
        )}
        <nav className="site-nav">
          <button
            type="button"
            className="nav-link theme-toggle-btn"
            onClick={toggleTheme}
            title={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
            aria-label="다크모드 전환"
          >
            {isDark ? SUN_ICON : MOON_ICON}
          </button>
          <button
            type="button"
            className="nav-link"
            onClick={resetAll}
            title="입력한 필터/스펙/결과를 모두 초기화합니다"
          >
            초기화
          </button>
          <button type="button" className="nav-link pill" onClick={() => navigate('/')}>
            홈
          </button>
          {!authLoading && (
            user ? (
              <>
                <span className="nav-user-email mono">{user.email}</span>
                <button type="button" className="nav-link" onClick={() => signOut()}>
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link className="nav-link" to={`/login?redirect=${encodeURIComponent(location.pathname)}`}>
                  로그인
                </Link>
                <Link className="nav-link pill" to={`/signup?redirect=${encodeURIComponent(location.pathname)}`}>
                  회원가입
                </Link>
              </>
            )
          )}
        </nav>
      </div>
    </header>
  )
}

export default Header
