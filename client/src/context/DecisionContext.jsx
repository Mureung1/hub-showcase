import { createContext, useContext, useEffect, useState } from "react"
import { getDecisions } from "../api/decisions.js"
import { useAuth } from "./AuthContext.jsx"

const DecisionContext = createContext(null)

// 사이드바 뱃지(Sidebar.jsx)와 인사이트 노트 화면(InsightNote.jsx)이 같은
// 카운트를 공유한다. 인사이트 노트에서 삭제가 일어나면 setDecisionCount로
// 즉시 반영해, 사이드바가 다음 로그인 때까지 옛 값을 보여주는 걸 막는다
// (VocabularyContext.jsx와 동일한 이유).
export function DecisionProvider({ children }) {
  const { user } = useAuth()
  const [decisionCount, setDecisionCount] = useState(0)

  useEffect(() => {
    if (user) {
      getDecisions()
        .then((decisions) => setDecisionCount(decisions.length))
        .catch(() => {})
    } else {
      setDecisionCount(0)
    }
  }, [user])

  return (
    <DecisionContext.Provider value={{ decisionCount, setDecisionCount }}>
      {children}
    </DecisionContext.Provider>
  )
}

export function useDecisionCount() {
  return useContext(DecisionContext)
}
