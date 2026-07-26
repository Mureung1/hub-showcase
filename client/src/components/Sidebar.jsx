import { useEffect, useState } from "react"
import { Link, NavLink } from "react-router-dom"
import { getVocabulary } from "../api/vocabulary.js"
import { getDecisions } from "../api/decisions.js"
import { useAuth } from "../context/AuthContext.jsx"

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function DashboardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  )
}

function VocabularyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </svg>
  )
}

function InsightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M14 7h7v7" />
    </svg>
  )
}

export default function Sidebar() {
  const { user, signOut } = useAuth()
  const [vocabularyCount, setVocabularyCount] = useState(0)
  const [decisionCount, setDecisionCount] = useState(0)

  useEffect(() => {
    // 단어장/판단 히스토리 모두 로그인 사용자별 데이터라 비로그인 상태에서는
    // 401만 돌아온다 — 뱃지 카운트는 로그인 상태일 때만 조회한다.
    if (user) {
      getVocabulary()
        .then((vocabulary) => setVocabularyCount(vocabulary.length))
        .catch(() => {})
      getDecisions()
        .then((decisions) => setDecisionCount(decisions.length))
        .catch(() => {})
    } else {
      setVocabularyCount(0)
      setDecisionCount(0)
    }
  }, [user])

  return (
    <nav className="sidebar" aria-label="글로벌 내비게이션">
      <Link to="/" className="sidebar-primary-btn">
        <PlusIcon />
        Today’s Top News
      </Link>

      <div className="sidebar-group">
        <p className="sidebar-group-label">Menu</p>
        <div className="sidebar-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
          >
            <span className="sidebar-link-label">
              <DashboardIcon />
              Dashboard
            </span>
          </NavLink>
          <NavLink
            to="/mypage"
            className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
          >
            <span className="sidebar-link-label">
              <InsightIcon />
              Insight Notes
            </span>
            <span className="sidebar-badge">{decisionCount}</span>
          </NavLink>
          <NavLink
            to="/vocabulary"
            className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
          >
            <span className="sidebar-link-label">
              <VocabularyIcon />
              Vocabulary
            </span>
            <span className="sidebar-badge">{vocabularyCount}</span>
          </NavLink>
        </div>
      </div>

      <div className="sidebar-auth">
        {user ? (
          <>
            <span className="sidebar-auth-email">{user.email}</span>
            <button type="button" className="sidebar-auth-action" onClick={() => signOut()}>
              로그아웃
            </button>
          </>
        ) : (
          <Link to="/login" className="sidebar-auth-action">
            로그인
          </Link>
        )}
      </div>
    </nav>
  )
}
