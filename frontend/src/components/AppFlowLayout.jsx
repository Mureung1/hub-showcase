import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { ChevronLeftIcon, LogoMark, HistoryIcon } from './icons.jsx'
import './AppFlow.css'

// 스텝퍼 노드 (프로토타입 기준) — 경로별 진행 상태 매핑
const STEP_NODES = ['아이디 입력', '프로필 분석', '조건 확인', '이슈 검색', '추천 결과']

// 경로 → 현재 활성 스텝 index. 값이 없으면(랜딩 등) 스텝퍼 숨김
const ROUTE_STEP = {
  '/input': 0,
  '/analyze': 1,
  '/profile': 2,
  '/search': 3,
  '/result': 4,
  '/detail': 4,
}

// 경로별 돌아가기 목적지 — 히스토리 back(-1) 대신 명시적 목적지를 쓴다
// (분석중 화면이 자동 전환이라 히스토리 back은 재분석→재전환 루프에 빠질 수 있음)
const BACK_TARGET = {
  '/input': '/',
  '/analyze': '/input',
  '/profile': '/input',
  '/search': '/profile',
  '/result': '/search',
  '/detail': '/result',
  '/history': '/result',
}

// githubId만 localStorage에 남긴다 — 새로고침/직접 URL 진입(예: /history) 시에도 "누구 이력인지"를
// 복원할 수 있어야 함. 다른 state(analysis/recommendation 등)는 매번 새로 요청하는 게 맞아 그대로 둔다
const GITHUB_ID_STORAGE_KEY = 'firstpr:githubId'

function AppFlowLayout() {
  const { pathname } = useLocation()
  // 화면 흐름 간 공유 상태 — 각 화면은 useOutletContext()로 읽고 쓴다
  const [githubId, setGithubIdState] = useState(() => localStorage.getItem(GITHUB_ID_STORAGE_KEY) ?? '')
  function setGithubId(value) {
    setGithubIdState(value)
    localStorage.setItem(GITHUB_ID_STORAGE_KEY, value)
  }
  const [analysis, setAnalysis] = useState(null)
  const [preferences, setPreferences] = useState(null)
  const [recommendation, setRecommendation] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const activeIndex = ROUTE_STEP[pathname]
  const fillPercent = activeIndex > 0 ? (activeIndex / (STEP_NODES.length - 1)) * 100 : 0
  const backTo = BACK_TARGET[pathname]

  return (
    <div className="flow">
      <div className="flow-topbar">
        {backTo && (
          <Link to={backTo} className="flow-back" aria-label="이전 화면으로">
            <ChevronLeftIcon />
          </Link>
        )}
        <Link to="/" className="flow-brand">
          <span className="flow-mark">
            <LogoMark />
          </span>
          <span>FirstPR</span>
        </Link>
        {githubId && (
          <Link to="/history" className="flow-history" aria-label="전체 검색 이력">
            <HistoryIcon />
            <span>이력</span>
          </Link>
        )}
      </div>

      {activeIndex !== undefined && (
        <div className="flow-stepper">
          <div className="flow-track">
            <span className="flow-fill" style={{ width: `${fillPercent}%` }} />
          </div>
          {STEP_NODES.map((tip, index) => {
            const state =
              index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'pending'
            return (
              <span
                key={tip}
                className={`flow-node flow-node-${state}`}
                style={{ left: `${(index / (STEP_NODES.length - 1)) * 100}%` }}
                data-tip={tip}
              />
            )
          })}
        </div>
      )}

      <Outlet
        context={{
          githubId,
          setGithubId,
          analysis,
          setAnalysis,
          preferences,
          setPreferences,
          recommendation,
          setRecommendation,
          selectedItem,
          setSelectedItem,
        }}
      />
    </div>
  )
}

export default AppFlowLayout
