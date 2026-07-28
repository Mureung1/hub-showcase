import { useFocusTrap } from '../lib/useFocusTrap.js'
import AppButton from './AppButton.jsx'
import { colors, font, layout, radius, shadow, spacing } from '../styles/theme.js'

// 파괴적 동작(끼니 삭제 등) 전에 확인을 받는 공용 모달 — ImportConflictDialog와 같은 시트 스타일을
// 쓰되, 목적이 "무엇을 어떻게 할지 고르기"가 아니라 "정말 할지 확인"이라 버튼이 확인/취소 둘뿐이다.
export default function ConfirmDialog({
  title,
  description,
  confirmLabel = '삭제',
  cancelLabel = '취소',
  busy = false,
  onConfirm,
  onCancel,
}) {
  const containerRef = useFocusTrap(true, busy ? undefined : onCancel)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      ref={containerRef}
      tabIndex={-1}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        background: 'rgba(25, 31, 40, 0.45)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: layout.pagePaddingX,
      }}
      onClick={() => !busy && onCancel()}
    >
      <div
        className="tds-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: layout.maxWidth,
          background: colors.surface,
          borderRadius: radius.lg,
          boxShadow: shadow.card,
          padding: spacing.xl,
          marginBottom: `calc(${spacing.xl}px + env(safe-area-inset-bottom))`,
          boxSizing: 'border-box',
        }}
      >
        <h3 id="confirm-dialog-title" style={{ margin: `0 0 ${spacing.sm}px`, fontSize: font.size.lg, color: colors.textStrong }}>
          {title}
        </h3>
        {description && (
          <p style={{ margin: `0 0 ${spacing.lg}px`, fontSize: font.size.sm, color: colors.textSub, lineHeight: 1.5 }}>
            {description}
          </p>
        )}

        <AppButton onClick={onConfirm} disabled={busy} style={{ background: colors.danger }}>
          {busy ? '삭제 중...' : confirmLabel}
        </AppButton>
        <button
          type="button"
          className="tds-press"
          onClick={onCancel}
          disabled={busy}
          style={{
            display: 'block',
            margin: `${spacing.md}px auto 0`,
            background: 'none',
            border: 'none',
            fontSize: font.size.sm,
            fontWeight: 600,
            padding: 0,
            color: colors.muted,
            cursor: busy ? 'not-allowed' : 'pointer',
          }}
        >
          {cancelLabel}
        </button>
      </div>
    </div>
  )
}
