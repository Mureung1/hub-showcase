import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react'
import styles from './ResizableNavigator.module.css'

type ResizableNavigatorProps = {
  ariaLabel: string
  children: ReactNode
  className?: string
  collapsedLabel: string
  defaultWidth?: number
  disableResizeQuery?: string
  maxWidth?: number
  minWidth?: number
  storageKey: string
}

const DEFAULT_MIN_WIDTH = 212
const DEFAULT_MAX_WIDTH = 340
const DEFAULT_WIDTH = 248
const COLLAPSED_WIDTH = 52

export function ResizableNavigator({
  ariaLabel,
  children,
  className,
  collapsedLabel,
  defaultWidth = DEFAULT_WIDTH,
  disableResizeQuery,
  maxWidth = DEFAULT_MAX_WIDTH,
  minWidth = DEFAULT_MIN_WIDTH,
  storageKey,
}: ResizableNavigatorProps) {
  const [width, setWidth] = useState(() => readStoredNumber(`${storageKey}:width`, defaultWidth))
  const [collapsed, setCollapsed] = useState(() => readStoredBoolean(`${storageKey}:collapsed`, false))
  const [resizeDisabled, setResizeDisabled] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(`${storageKey}:width`, String(width))
  }, [storageKey, width])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(`${storageKey}:collapsed`, String(collapsed))
  }, [collapsed, storageKey])

  useEffect(() => {
    if (!disableResizeQuery || typeof window === 'undefined') {
      return undefined
    }

    const query = window.matchMedia(disableResizeQuery)
    const updateResizeDisabled = () => setResizeDisabled(query.matches)
    updateResizeDisabled()
    query.addEventListener('change', updateResizeDisabled)

    return () => query.removeEventListener('change', updateResizeDisabled)
  }, [disableResizeQuery])

  const boundedWidth = useMemo(
    () => Math.min(maxWidth, Math.max(minWidth, width)),
    [maxWidth, minWidth, width],
  )

  if (collapsed && !resizeDisabled) {
    return (
      <aside
        aria-label={ariaLabel}
        className={styles.collapsed}
        style={{ width: COLLAPSED_WIDTH } satisfies CSSProperties}
      >
        <button type="button" onClick={() => setCollapsed(false)}>
          {collapsedLabel}
        </button>
      </aside>
    )
  }

  function handleResizeStart(event: ReactPointerEvent<HTMLButtonElement>) {
    if (resizeDisabled) {
      return
    }

    const startX = event.clientX
    const startWidth = boundedWidth
    const pointerId = event.pointerId
    event.currentTarget.setPointerCapture(pointerId)

    function handlePointerMove(moveEvent: PointerEvent) {
      const nextWidth = startWidth + moveEvent.clientX - startX
      setWidth(Math.min(maxWidth, Math.max(minWidth, nextWidth)))
    }

    function handlePointerUp() {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
  }

  return (
    <aside
      aria-label={ariaLabel}
      className={[styles.navigator, className].filter(Boolean).join(' ')}
      style={resizeDisabled ? undefined : ({ width: boundedWidth } satisfies CSSProperties)}
    >
      {!resizeDisabled ? (
        <div className={styles.controls}>
          <button
            type="button"
            aria-label="네비게이터 숨기기"
            title="네비게이터 숨기기"
            onClick={() => setCollapsed(true)}
          >
            <span aria-hidden="true">&lt;</span>
          </button>
        </div>
      ) : null}
      {children}
      {!resizeDisabled ? (
        <button
          type="button"
          className={styles.resizeHandle}
          aria-label="네비게이터 폭 조절"
          onPointerDown={handleResizeStart}
        />
      ) : null}
    </aside>
  )
}

function readStoredNumber(key: string, fallback: number) {
  if (typeof window === 'undefined') {
    return fallback
  }

  const storedValue = Number(window.localStorage.getItem(key))
  return Number.isFinite(storedValue) ? storedValue : fallback
}

function readStoredBoolean(key: string, fallback: boolean) {
  if (typeof window === 'undefined') {
    return fallback
  }

  const storedValue = window.localStorage.getItem(key)

  if (storedValue === 'true') {
    return true
  }

  if (storedValue === 'false') {
    return false
  }

  return fallback
}
