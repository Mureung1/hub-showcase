import { colors, font, radius } from '../styles/theme.js'

// server/nutrition/precisionEngine.js가 이미 계산해 돌려주던 confidence(high/medium/low)를 처음으로
// 화면에 노출한다(트랙 2 §2) — 지금까지는 응답에 실려오기만 하고 어느 화면도 쓰지 않았다. Cal AI·
// Foodvisor·SnapCalorie 등 사진 트래커 대부분이 이 값을 숨기는 것과 달리, 이미 계산해둔 값이라
// 노출 비용이 사실상 0이다. "부정확"처럼 실패로 읽히는 단어 대신 "확인해보세요" 톤을 쓴다 —
// src/lib/allergyRules.js가 공식/추정을 구분해 보여주는 것과 같은 정직성 원칙.
const CONFIDENCE_STYLE = {
  high: { label: '정확도 높음', bg: colors.infoSurface, color: colors.info },
  medium: { label: '정확도 보통', bg: colors.deficientSurface, color: colors.deficientText },
  low: { label: '정확도 낮음 · 확인해보세요', bg: colors.bg, color: colors.textSub },
}

export default function ConfidenceBadge({ confidence }) {
  const meta = CONFIDENCE_STYLE[confidence]
  if (!meta) return null

  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: font.size.xs,
        fontWeight: 700,
        padding: '3px 10px',
        borderRadius: radius.pill,
        background: meta.bg,
        color: meta.color,
      }}
    >
      {meta.label}
    </span>
  )
}
