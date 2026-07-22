import AppButton from './AppButton.jsx'
import { colors, font, layout, radius, shadow, spacing } from '../styles/theme.js'

// CSV 가져오기에서 이미 기록이 있는 날짜를 만났을 때 "덮어쓰기 / 건너뛰기"를 고르게 하는 다이얼로그
// (PRD v2.0 FR-2.2). 사용자가 고르기 전까지는 아직 아무 것도 저장되지 않은 상태다.
export default function ImportConflictDialog({ duplicateDates, totalDates, busy, onOverwrite, onSkip, onCancel }) {
  const preview = duplicateDates.slice(0, 5)
  const rest = duplicateDates.length - preview.length

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-conflict-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
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
        <h3 id="import-conflict-title" style={{ margin: `0 0 ${spacing.sm}px`, fontSize: font.size.lg, color: colors.textStrong }}>
          이미 기록이 있는 날짜가 있어요
        </h3>
        <p style={{ margin: `0 0 ${spacing.md}px`, fontSize: font.size.sm, color: colors.textSub, lineHeight: 1.5 }}>
          가져올 {totalDates}일 중 {duplicateDates.length}일은 이미 기록이 있어요. 이 날짜들을 어떻게 할까요?
        </p>

        <div
          style={{
            background: colors.bg,
            borderRadius: radius.sm,
            padding: spacing.md,
            marginBottom: spacing.lg,
            fontSize: font.size.xs,
            color: colors.textSub,
            lineHeight: 1.6,
          }}
        >
          {preview.join(', ')}
          {rest > 0 && ` 외 ${rest}일`}
        </div>

        <AppButton onClick={onOverwrite} disabled={busy}>
          {busy ? '가져오는 중...' : '덮어쓰기'}
        </AppButton>
        <AppButton
          variant="secondary"
          onClick={onSkip}
          disabled={busy}
          style={{ width: '100%', height: 48, borderRadius: radius.md, marginTop: spacing.sm }}
        >
          건너뛰기 (나머지 날짜만 가져오기)
        </AppButton>
        <button
          type="button"
          className="tds-press"
          onClick={onCancel}
          disabled={busy}
          style={{
            ...styleLinkCenter,
            color: colors.muted,
            cursor: busy ? 'not-allowed' : 'pointer',
          }}
        >
          취소
        </button>
      </div>
    </div>
  )
}

const styleLinkCenter = {
  display: 'block',
  margin: `${spacing.md}px auto 0`,
  background: 'none',
  border: 'none',
  fontSize: font.size.sm,
  fontWeight: 600,
  padding: 0,
}
