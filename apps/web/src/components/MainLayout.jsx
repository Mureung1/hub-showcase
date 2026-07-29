/* ═══════════════════════════════════════════════════════════════════════════
   MainLayout — 2컬럼 레이아웃 공통 컴포넌트
   사이드바 + 메인 스테이지 구조 재사용
   ═══════════════════════════════════════════════════════════════════════════ */

import SpaceCard from './SpaceCard.jsx'
import StageHeader from './StageHeader.jsx'

export default function MainLayout({
  spaces,
  selectedSpace,
  onSelectSpace,
  headerProps,
  children,
  footer,
}) {
  return (
    <div style={{
      maxWidth: 'var(--width-container)',
      margin: '26px auto 0',
      padding: '0 32px 60px',
    }}>
      <div style={{
        position: 'relative',
        backgroundColor: '#fff',
        border: '1px solid var(--color-border)',
        borderRadius: 26,
        boxShadow: 'var(--shadow-hero)',
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: '300px 1fr',
        minHeight: 500,
      }}>
        {/* 사이드바 */}
        <aside style={{
          background: 'var(--color-sidebar)',
          borderRight: '1px solid var(--color-border)',
          padding: '26px 22px',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <h2 style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.02em',
            color: 'var(--color-ink-soft)',
            margin: '0 0 16px',
          }}>
            내 집 상태
          </h2>
          {spaces.map((space) => (
            <SpaceCard
              key={space.id}
              space={space}
              isSelected={space.id === selectedSpace}
              onClick={() => onSelectSpace(space.id)}
            />
          ))}
          <div style={{
            marginTop: 'auto',
            paddingTop: 20,
            fontSize: 12,
            color: 'var(--color-ink-soft)',
            lineHeight: 1.6,
            borderTop: '1px solid var(--color-border)',
          }}>
            별다른 입력이 없으면 잘 지내는 걸로 볼게요.
          </div>
        </aside>

        {/* 메인 콘텐츠 */}
        <main style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          <StageHeader {...headerProps} />
          <div style={{ padding: 30, flex: 1, overflow: 'auto' }}>
            {children}
          </div>
          {footer}
        </main>
      </div>
    </div>
  )
}
