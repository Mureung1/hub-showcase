import { useNavigate } from 'react-router-dom'
import { AwardIcon, BarChartIcon, DropletIcon, LightbulbIcon, PillIcon, SettingsIcon, TargetIcon, TrophyIcon } from './icons/index.jsx'
import { colors, font, spacing } from '../styles/theme.js'

// MY 탭 개편(1a/2a 시안) — 바로가기 4×2 그리드. 정사각 타일(radius 17) + 마크. 시안이 지정한
// 정확한 배경/마크 색은 전부 이 앱의 의미론적 토큰이 아니라 이 그리드 전용 장식색이라(예: 골드
// 배지색, 퍼플 퀴즈색) theme.js에 새 토큰을 추가하지 않고 그대로 인라인했다(그린/블루/회색만
// 기존 토큰 재사용).
//
// 마크는 원래 border-radius/transform으로 만든 맨 div 도형이었는데(사각형·막대·도넛·마름모…),
// 기능과의 연결이 안 읽혀서 각 기능의 은유를 가진 듀오톤 아이콘으로 바꿨다(icons/index.jsx).
// 이모지로 되돌리지는 않는다 — docs/02-디자인.md가 이모지 장식을 금지하고, 이 그리드도 원래
// 이모지였다가 의도적으로 걷어낸 이력이 있다. 아이콘 색은 currentColor라 Tile의 color 하나로
// 채움·선 두 톤이 함께 따라간다.
//
// "영양제"는 화면 이동이 아니라 즉시 토글(+토스트)이다 — 다른 7개와 동작 방식 자체가 달라 path
// 대신 onToggle을 받는다. 나머지 7개는 예전과 같은 경로로 이동한다.
function Tile({ bg, color, children }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: 52,
        height: 52,
        borderRadius: 17,
        background: bg,
        color,
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
        <Tile bg={colors.primarySurface} color={colors.primary}>
          <TargetIcon />
        </Tile>
      ),
    },
    {
      key: 'leaderboard',
      label: '리더보드',
      onClick: () => navigate('/profile/leaderboard'),
      tile: (
        <Tile bg={colors.infoSurface} color={colors.info}>
          <TrophyIcon />
        </Tile>
      ),
    },
    {
      key: 'badges',
      label: '배지 도감',
      onClick: () => navigate('/profile/badges'),
      tile: (
        <Tile bg="#FFF5E6" color="#E8A33D">
          <AwardIcon />
        </Tile>
      ),
    },
    {
      key: 'quiz',
      label: '식단 퀴즈',
      onClick: () => navigate('/profile/quiz'),
      tile: (
        <Tile bg="#F3F0FF" color="#7B61D9">
          <LightbulbIcon />
        </Tile>
      ),
    },
    {
      key: 'water',
      label: '물 기록',
      onClick: () => navigate('/profile/water'),
      tile: (
        <Tile bg="#E6F6FB" color="#1A9FC4">
          <DropletIcon />
        </Tile>
      ),
    },
    {
      key: 'supplement',
      label: '영양제',
      onClick: onToggleSupplement,
      // 유일하게 상태를 가진 타일 — 복용 체크 시 배경/아이콘 색이 반전된다(동작 자체를 바꾸지 말 것).
      tile: (
        <Tile bg={supplementTaken ? colors.primary : colors.primarySurface} color={supplementTaken ? '#fff' : colors.primary}>
          <PillIcon />
        </Tile>
      ),
    },
    {
      key: 'recommended',
      label: '권장 섭취량',
      onClick: () => navigate('/profile/recommended'),
      tile: (
        <Tile bg={colors.bg} color="#6B7684">
          <BarChartIcon />
        </Tile>
      ),
    },
    {
      key: 'card-settings',
      label: '카드 항목',
      onClick: () => navigate('/profile/card-settings'),
      tile: (
        <Tile bg={colors.bg} color="#6B7684">
          <SettingsIcon />
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
