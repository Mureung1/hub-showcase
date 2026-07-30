import Pressable from './Pressable.jsx'
import { ChevronLeftIcon } from './icons/index.jsx'
import { colors, font, radius, shadow, spacing } from '../styles/theme.js'

// 뒤로가기 버튼은 원래 문자 '←'(U+2190)를 fontSize 20으로 찍은 것이라, 폰트 폴백에 따라 헤어라인으로
// 그려져 거의 안 보였고 히트 영역도 약 13×24px밖에 안 됐다. docs/02-디자인.md의 Icon Button 규격
// (44×44, radius.full, 원형 배경)에 맞춰 다시 만들었다.
//
// 배경색만 토스 문서와 다르게 간다: 문서는 grey.100을 쓰라고 하지만 이 앱의 페이지 배경이 이미
// colors.bg(#F2F4F6, grey.100 대응)라 회색 원이 배경에 묻힌다. 흰 서페이스 + 얕은 그림자가 같은
// 의도(면으로 구분되는 누를 수 있는 원)를 이 배경에서 달성하고, 카드와 같은 시각 언어라 시스템에서
// 벗어나지도 않는다. 배경은 누를 때만이 아니라 **상시** 보인다 — 고치려는 문제가 시인성이라
// 눌러야 나타나는 배경으로는 해결되지 않는다.
const BACK_BUTTON_SIZE = 44

export default function ScreenHeader({ title, subtitle, onBack }) {
  return (
    <div style={{ marginBottom: spacing.xl }}>
      {onBack && (
        <Pressable
          type="button"
          onClick={onBack}
          aria-label="뒤로가기"
          style={{
            width: BACK_BUTTON_SIZE,
            height: BACK_BUTTON_SIZE,
            marginBottom: spacing.sm,
            marginLeft: -spacing.xs, // 아이콘 광학 중심을 타이틀 왼쪽 끝에 맞춘다
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: colors.surface,
            border: 'none',
            borderRadius: radius.pill,
            boxShadow: shadow.sm,
            color: colors.textStrong,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <ChevronLeftIcon />
        </Pressable>
      )}
      <h1 style={{ fontSize: font.size.title, margin: 0, fontWeight: 800, color: colors.textStrong }}>{title}</h1>
      {subtitle && (
        <p style={{ marginTop: spacing.xs, color: colors.textSub, fontSize: font.size.md }}>{subtitle}</p>
      )}
    </div>
  )
}
