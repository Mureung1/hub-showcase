import './StatusBox.css'

export type StatusBoxVariant = 'loading' | 'error' | 'empty'

interface StatusBoxProps {
  variant: StatusBoxVariant
  message: string
  actionLabel?: string
  onAction?: () => void
}

const ICONS: Record<StatusBoxVariant, string> = {
  loading: '⏳',
  error: '⚠️',
  empty: '📭',
}

/** 목록/상세 화면에서 공통으로 쓰는 로딩 · 에러 · 빈 결과 상태 박스 */
export default function StatusBox({
  variant,
  message,
  actionLabel,
  onAction,
}: StatusBoxProps) {
  return (
    <div className={`status-box status-box-${variant}`}>
      <div className="status-box-icon" aria-hidden="true">
        {ICONS[variant]}
      </div>
      <p className="status-box-message">{message}</p>
      {actionLabel && onAction && (
        <button type="button" className="status-box-action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}
