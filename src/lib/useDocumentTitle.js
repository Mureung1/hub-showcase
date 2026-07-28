import { useEffect } from 'react'

// 라우트별 document.title. 이전엔 모든 화면이 index.html의 "Mealyze" 하나를 공유해서, 브라우저
// 히스토리·최근 앱 전환기에서 화면을 구분할 수 없었다. title: TABS(tabs.js) 라벨 등 화면을 설명하는
// 짧은 문구 — 브랜드 접미사는 여기서 한 곳에만 붙인다.
export function useDocumentTitle(title) {
  useEffect(() => {
    if (!title) return
    document.title = `${title} · Mealyze`
  }, [title])
}
