import { createContext, useContext, useEffect, useState } from "react"
import { getVocabulary } from "../api/vocabulary.js"
import { useAuth } from "./AuthContext.jsx"

const VocabularyContext = createContext(null)

// 사이드바 뱃지(Sidebar.jsx)와 단어장 화면(Vocabulary.jsx)이 같은 카운트를
// 공유한다. 단어장 화면에서 삭제가 일어나면 setVocabularyCount로 즉시
// 반영해, 사이드바가 다음 로그인 때까지 옛 값을 보여주는 걸 막는다.
export function VocabularyProvider({ children }) {
  const { user } = useAuth()
  const [vocabularyCount, setVocabularyCount] = useState(0)

  useEffect(() => {
    if (user) {
      getVocabulary()
        .then((vocabulary) => setVocabularyCount(vocabulary.length))
        .catch(() => {})
    } else {
      setVocabularyCount(0)
    }
  }, [user])

  return (
    <VocabularyContext.Provider value={{ vocabularyCount, setVocabularyCount }}>
      {children}
    </VocabularyContext.Provider>
  )
}

export function useVocabularyCount() {
  return useContext(VocabularyContext)
}
