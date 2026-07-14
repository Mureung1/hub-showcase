import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
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

function AppFlowLayout() {
  const { pathname } = useLocation()
  // 화면 흐름 간 공유 상태 — 각 화면은 useOutletContext()로 읽고 쓴다
  const [githubId, setGithubId] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [recommendation, setRecommendation] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const activeIndex = ROUTE_STEP[pathname]
  const fillPercent = activeIndex > 0 ? (activeIndex / (STEP_NODES.length - 1)) * 100 : 0

  return (
    <div className="flow">
      <div className="flow-topbar">
        <Link to="/" className="flow-brand">
          <span className="flow-mark">↣</span>
          <span>First-pr</span>
        </Link>
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
