/* ═══════════════════════════════════════════════════════════════════════════
   SpaceCard — 사이드바 공간 선택 카드
   ═══════════════════════════════════════════════════════════════════════════ */

export default function SpaceCard({ space, isSelected, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 13,
        borderRadius: 16,
        cursor: 'pointer',
        marginBottom: 8,
        backgroundColor: isSelected ? '#fff' : 'transparent',
        border: `1px solid ${isSelected ? 'var(--color-mint)' : 'transparent'}`,
        boxShadow: isSelected ? 'var(--shadow-card)' : 'none',
        transition: 'all var(--transition-fast)',
      }}
    >
      <div style={{
        width: 42,
        height: 42,
        borderRadius: 12,
        background: 'var(--color-mint-soft)',
        display: 'grid',
        placeItems: 'center',
        fontSize: 20,
        flexShrink: 0,
      }}>
        {space.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <b style={{ fontSize: 14.5, display: 'block' }}>{space.name}</b>
        <span style={{
          fontSize: 12,
          color: space.hasIssue ? 'var(--color-amber)' : 'var(--color-ink-soft)',
          fontWeight: space.hasIssue ? 600 : 400,
        }}>
          {space.detail || '확인 대기'}
        </span>
      </div>
      {space.pill && (
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          padding: '3px 9px',
          borderRadius: 20,
          background: 'var(--color-mint-soft)',
          color: 'var(--color-mint-deep)',
          whiteSpace: 'nowrap',
        }}>
          {space.pill}
        </span>
      )}
    </div>
  )
}
