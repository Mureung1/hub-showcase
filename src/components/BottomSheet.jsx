import { colors, radius } from '../styles/theme.js'

// 지도 탭 개편(지도·달력 모바일 개편 3안) — 지도 위에 뜨는 바텀시트. 접힘 330px ↔ 펼침 640px를
// "높이"가 아니라 "이동"으로 구현한다 — 이 프로젝트는 리플로우를 유발하는 속성(height/width 등)을
// 절대 애니메이션하지 않고 transform/opacity만 쓴다는 확립된 규칙이 있어(CLAUDE.md, index.css의
// 다른 전환들 참고), 시트도 항상 EXPANDED_HEIGHT로 고정해두고 collapse는 그만큼 아래로
// translateY할 뿐이다 — 부모(MapPage.jsx)가 overflow:hidden이라 화면 밖으로 밀려난 나머지는
// 자연히 가려진다. 드래그 제스처는 의도적으로 생략했다(탭 토글만 필수 요구사항 — 새 의존성
// 없이 구현 가능한 범위로 스코프를 좁혔다).
const EXPANDED_HEIGHT = 640
const COLLAPSED_HEIGHT = 330
const COLLAPSE_OFFSET = EXPANDED_HEIGHT - COLLAPSED_HEIGHT

// footer: 스크롤 영역 밖에 고정으로 붙는 영역(지도 탭의 "두 곳 비교하기" 풀폭 버튼처럼, 목록을
// 스크롤해도 항상 눌려야 하는 액션). 생략하면 기존처럼 children이 시트 전체를 스크롤 영역으로 쓴다.
export default function BottomSheet({ expanded, onToggle, footer, children }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: EXPANDED_HEIGHT,
        maxHeight: '92%',
        transform: `translateY(${expanded ? 0 : COLLAPSE_OFFSET}px)`,
        transition: 'transform 280ms cubic-bezier(0.2, 0.9, 0.3, 1)',
        background: colors.surface,
        borderRadius: `${radius.lg}px ${radius.lg}px 0 0`,
        boxShadow: '0 -6px 24px rgba(0, 0, 0, 0.12)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={expanded ? '목록 접기' : '목록 펼치기'}
        className="tds-press"
        style={{
          flexShrink: 0,
          border: 'none',
          background: 'none',
          padding: '10px 0 6px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <span aria-hidden="true" style={{ width: 44, height: 4, borderRadius: radius.pill, background: colors.border }} />
      </button>
      <div className="tds-no-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {children}
      </div>
      {footer && <div style={{ flexShrink: 0, padding: '0 18px 16px' }}>{footer}</div>}
    </div>
  )
}
