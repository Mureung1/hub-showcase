import { useEffect, useState } from 'react'

// useState처럼 쓰되, 값이 바뀔 때마다 localStorage에도 자동 저장하는 훅.
// 새로고침·재방문해도 상태가 유지되는 이유가 이 훅 덕분이다.
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    // 초기 렌더링 시 localStorage에 저장된 값이 있으면 그걸 초기값으로 사용
    const stored = window.localStorage.getItem(key)
    if (stored === null) return initialValue
    try {
      return JSON.parse(stored) as T
    } catch {
      // 저장된 값이 손상됐으면 initialValue로 폴백
      return initialValue
    }
  })

  // value가 바뀔 때마다 localStorage 동기화
  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  // useState와 동일한 [value, setter] 튜플을 반환
  return [value, setValue] as const
}
