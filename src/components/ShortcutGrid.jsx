import { useNavigate } from 'react-router-dom'
import { colors, font, radius, spacing } from '../styles/theme.js'

// MY 탭 개편(1a/2a 시안) — 바로가기 4×2 그리드. 예전엔 원형 타일 + 이모지였다. 이제 정사각 타일
// (radius 17) + 단순 도형 마크로 바뀌었다 — 시안이 지정한 정확한 배경/마크 색은 전부 이 앱의
// 의미론적 토큰이 아니라 이 그리드 전용 장식색이라(예: 골드 배지색, 퍼플 퀴즈색) theme.js에 새
// 토큰을 추가하지 않고 그대로 인라인했다(그린/블루/회색만 기존 토큰 재사용).
//
// "영양제"는 화면 이동이 아니라 즉시 토글(+토스트)이다 — 다른 7개와 동작 방식 자체가 달라 path
// 대신 onToggle을 받는다. 나머지 7개는 예전과 같은 경로로 이동한다.
function Tile({ bg, children }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: 52,
        height: 52,
        borderRadius: 17,
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </div>
  )
}

function ShortcutItem({ label, tile, onClick }) {
  return (
    <button
      type="button"
      className="tds-press"
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 7,
        padding: 0,
      }}
    >
      {tile}
      <span style={{ fontSize: 11.5, color: colors.textSub, fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  )
}

export default function ShortcutGrid({ supplementTaken, onToggleSupplement }) {
  const navigate = useNavigate()

  const items = [
    {
      key: 'quests',
      label: '퀘스트',
      onClick: () => navigate('/profile/quests'),
      tile: (
        <Tile bg={colors.primarySurface}>
          <div style={{ width: 20, height: 20, borderRadius: 6, background: colors.primary }} />
        </Tile>
      ),
    },
    {
      key: 'leaderboard',
      label: '리더보드',
      onClick: () => navigate('/profile/leaderboard'),
      tile: (
        <Tile bg={colors.infoSurface}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3 }}>
            {[10, 18, 14].map((h, i) => (
              <div key={i} style={{ width: 5, height: h, borderRadius: 2, background: colors.info }} />
            ))}
          </div>
        </Tile>
      ),
    },
    {
      key: 'badges',
      label: '배지 도감',
      onClick: () => navigate('/profile/badges'),
      tile: (
        <Tile bg="#FFF5E6">
          <div style={{ width: 20, height: 20, borderRadius: '50%', border: '4px solid #E8A33D', boxSizing: 'border-box' }} />
        </Tile>
      ),
    },
    {
      key: 'quiz',
      label: '식단 퀴즈',
      onClick: () => navigate('/profile/quiz'),
      tile: (
        <Tile bg="#F3F0FF">
          <div style={{ width: 18, height: 18, background: '#7B61D9', borderRadius: 4, transform: 'rotate(45deg)' }} />
        </Tile>
      ),
    },
    {
      key: 'water',
      label: '물 기록',
      onClick: () => navigate('/profile/water'),
      tile: (
        <Tile bg="#E6F6FB">
          <div style={{ width: 18, height: 18, background: '#1A9FC4', borderRadius: '50% 50% 50% 4px', transform: 'rotate(-45deg)' }} />
        </Tile>
      ),
    },
    {
      key: 'supplement',
      label: '영양제',
      onClick: onToggleSupplement,
      tile: (
        <Tile bg={supplementTaken ? colors.primary : colors.primarySurface}>
          <div style={{ width: 22, height: 12, borderRadius: radius.pill, background: supplementTaken ? '#fff' : colors.primary }} />
        </Tile>
      ),
    },
    {
      key: 'recommended',
      label: '권장 섭취량',
      onClick: () => navigate('/profile/recommended'),
      tile: (
        <Tile bg={colors.bg}>
          <div style={{ width: 20, height: 20, borderRadius: 5, border: '3px solid #6B7684', boxSizing: 'border-box' }} />
        </Tile>
      ),
    },
    {
      key: 'card-settings',
      label: '카드 항목',
      onClick: () => navigate('/profile/card-settings'),
      tile: (
        <Tile bg={colors.bg}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
            {['#6B7684', '#6B7684', '#6B7684', '#C4CBD3'].map((c, i) => (
              <div key={i} style={{ width: 7, height: 7, borderRadius: 2, background: c }} />
            ))}
          </div>
        </Tile>
      ),
    },
  ]

  return (
    <div style={{ marginBottom: spacing.lg }}>
      <h3 style={{ margin: `0 0 ${spacing.md}px`, fontSize: font.size.sm, fontWeight: 700, color: colors.textStrong }}>바로가기</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', rowGap: 14, columnGap: 6 }}>
        {items.map((item) => (
          <ShortcutItem key={item.key} label={item.label} tile={item.tile} onClick={item.onClick} />
        ))}
      </div>
    </div>
  )
}
