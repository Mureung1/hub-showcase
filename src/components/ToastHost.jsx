import { colors, font, layout, radius, shadow, spacing } from '../styles/theme.js'

// ToastContext가 관리하는 토스트 목록을 화면 하단(탭바 위)에 겹쳐 그린다. 표시 로직만 담당하고
// 타이머/스택 관리는 컨텍스트 쪽에 있다.
// 위치: 하단 탭바(고정) 바로 위 + 안전영역. 애니메이션은 transform/opacity만 쓴다(레이아웃 속성 금지).
const TAB_BAR_HEIGHT = 76

const TONE_STYLE = {
  success: { background: colors.textStrong, color: '#fff' },
  error: { background: colors.danger, color: '#fff' },
  info: { background: colors.textStrong, color: '#fff' },
}

export default function ToastHost({ toasts, onDismiss }) {
  if (toasts.length === 0) return null

  return (
    <div
      // 토스트가 덮은 영역의 클릭이 막히지 않도록 컨테이너는 이벤트를 통과시키고, 실제 토스트 카드만
      // 다시 이벤트를 받는다(액션 버튼이 눌려야 하므로).
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: `calc(${TAB_BAR_HEIGHT}px + env(safe-area-inset-bottom))`,
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: spacing.sm,
        padding: `0 ${layout.pagePaddingX}px`,
        pointerEvents: 'none',
      }}
      role="status"
      aria-live="polite"
    >
      {toasts.map(({ id, message, tone, action }) => {
        const toneStyle = TONE_STYLE[tone] ?? TONE_STYLE.info

        return (
          <div
            key={id}
            className="tds-toast"
            style={{
              ...toneStyle,
              pointerEvents: 'auto',
              width: '100%',
              maxWidth: layout.maxWidth,
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              gap: spacing.md,
              padding: `${spacing.md}px ${spacing.lg}px`,
              borderRadius: radius.md,
              boxShadow: shadow.card,
              fontSize: font.size.sm,
              lineHeight: 1.45,
            }}
          >
            <span style={{ flex: 1, minWidth: 0 }}>{message}</span>

            {action && (
              <button
                type="button"
                className="tds-press"
                onClick={() => {
                  action.onClick?.()
                  onDismiss(id)
                }}
                style={{
                  flexShrink: 0,
                  background: 'rgba(255, 255, 255, 0.18)',
                  border: 'none',
                  borderRadius: radius.pill,
                  color: 'inherit',
                  fontSize: font.size.sm,
                  fontWeight: 700,
                  padding: `${spacing.xs}px ${spacing.md}px`,
                  cursor: 'pointer',
                }}
              >
                {action.label}
              </button>
            )}

            <button
              type="button"
              onClick={() => onDismiss(id)}
              aria-label="알림 닫기"
              style={{
                flexShrink: 0,
                background: 'none',
                border: 'none',
                color: 'inherit',
                opacity: 0.6,
                fontSize: font.size.md,
                lineHeight: 1,
                padding: 0,
                cursor: 'pointer',
              }}
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}
