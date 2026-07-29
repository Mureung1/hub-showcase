/* ═══════════════════════════════════════════════════════════════════════════
   StageHeader — 메인 스테이지 헤더
   eyebrow + 제목 + 서브타이틀 + 진행 표시
   ═══════════════════════════════════════════════════════════════════════════ */

export default function StageHeader({
  eyebrow,
  title,
  sub,
  onReset,
  showReset,
  step,
  totalSteps,
}) {
  return (
    <div style={{
      padding: '22px 30px',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
    }}>
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          font: 'var(--font-eyebrow)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--color-mint-deep)',
          marginBottom: 6,
        }}>
          <span style={{
            width: 13,
            height: 2,
            background: 'var(--color-mint)',
            display: 'inline-block',
            borderRadius: 2,
          }} />
          {eyebrow}
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em' }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-ink-soft)', marginTop: 2 }}>
          {sub}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {showReset && (
          <button
            onClick={onReset}
            style={{
              fontSize: 12.5,
              color: 'var(--color-ink-soft)',
              borderBottom: '1px dotted var(--color-ink-soft)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            새로 시작
          </button>
        )}
        {totalSteps > 0 && (
          <div style={{ display: 'flex', gap: 6 }}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span
                key={i}
                style={{
                  height: 8,
                  borderRadius: 6,
                  background: i === step ? 'var(--color-mint)' : 'var(--color-border)',
                  width: i === step ? 22 : 8,
                  transition: 'var(--transition-fast)',
                  display: 'inline-block',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
