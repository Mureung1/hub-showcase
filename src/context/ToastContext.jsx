import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import ToastHost from '../components/ToastHost.jsx'

// 전역 토스트. PRD FR-2.1이 "어떤 환경에서도 무반응(silent fail) 금지 — 성공/실패 토스트 필수"를
// 요구해서, 화면 하단에 잠깐 떴다 사라지는 알림을 한 곳에서 관리한다.
// 화면들은 useToast()의 showToast()만 부르면 되고, 표시/타이머/스택 관리는 여기가 맡는다.
const ToastContext = createContext(null)

const DEFAULT_DURATION_MS = 3200
// 액션 버튼(예: "공유하기")이 달린 토스트는 사용자가 읽고 누를 시간이 더 필요하다.
const ACTION_DURATION_MS = 6000

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  // 나가는 애니메이션 중에 타이머가 중복으로 걸리지 않도록 id별 타이머를 추적한다.
  const timers = useRef(new Map())
  const nextId = useRef(0)

  const dismissToast = useCallback((id) => {
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // tone: 'success' | 'error' | 'info'. action: { label, onClick } — 누르면 토스트가 닫힌다.
  const showToast = useCallback(
    (message, { tone = 'info', action = null, duration } = {}) => {
      if (!message) return null
      const id = ++nextId.current
      const ttl = duration ?? (action ? ACTION_DURATION_MS : DEFAULT_DURATION_MS)

      // 동시에 여러 개가 쌓여 화면을 덮지 않도록 최근 2개만 남긴다.
      setToasts((prev) => [...prev, { id, message, tone, action }].slice(-2))
      timers.current.set(
        id,
        setTimeout(() => dismissToast(id), ttl),
      )
      return id
    },
    [dismissToast],
  )

  const value = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastHost toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

// Provider 바깥에서 불려도 앱이 죽지 않도록 no-op으로 폴백한다(토스트는 부가 알림이라, 이것 때문에
// 화면 전체가 에러 바운더리로 넘어가면 손해가 더 크다).
const NOOP_TOAST = { showToast: () => null, dismissToast: () => {} }

export function useToast() {
  return useContext(ToastContext) ?? NOOP_TOAST
}
