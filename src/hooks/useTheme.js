import { useCallback, useState } from 'react'
import { THEME_STORAGE_KEY } from '../constants/storageKeys'

// index.html의 인라인 스크립트가 첫 페인트 전에 이미 <html data-theme="..."> 를 세팅해두므로,
// 여기서는 그 값을 초기 상태로 그대로 읽어오기만 하면 된다(다시 계산하지 않음).
function getInitialTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme)

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      document.documentElement.setAttribute('data-theme', next)
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next)
      } catch {
        // localStorage 사용 불가(프라이빗 모드 등) 시 조용히 무시 — 이번 세션에서만 토글이 유지된다.
      }
      return next
    })
  }, [])

  return { theme, toggleTheme }
}
