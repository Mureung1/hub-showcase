import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import './ToastProvider.css'

type ToastContextValue = (message: string) => void
// study: Context: 매번 props drilling 하지않고 트리 전체 아무데서나 바로 토스트 꺼내쓸 수 있도록 하기 위해 필요. (전역 상자)
const ToastContext = createContext<ToastContextValue | null>(null) 

const DISPLAY_DURATION_MS = 2000

function ToastProvider({ children }: { children: ReactNode }) { // study:  이걸로 Layout.tsx 전체를 감싼다 -> 안에 있는 모든 것이 ToastProvider의 자손이 됨 -> 앱의 어느 페이지에서든 useToast()를 호출가능
  const [message, setMessage] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null) // study: useRef 는 값을 기억하지만, 리렌더링 안시킨다. 그냥 기억만 해두고 싶은 값에 사용. 이 경우에는 timer id

  // study: 실제 토스트 띄워주는 함수.
  // 새 토스트가 호출되면 이전 타이머를 지우고 다시 시작.
  const showToast = useCallback((next: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setMessage(next)
    timerRef.current = setTimeout(() => setMessage(null), DISPLAY_DURATION_MS)
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {message && (
        <div className="toast transition-fade-in" role="status">
          {message}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const showToast = useContext(ToastContext)
  if (!showToast) throw new Error('useToast는 ToastProvider 안에서만 사용할 수 있어요')
  return showToast
}

export default ToastProvider
