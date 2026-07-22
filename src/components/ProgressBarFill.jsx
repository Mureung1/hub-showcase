import { radius } from '../styles/theme.js'

// 영양소 진행 막대의 채움 부분. 앱 안의 모든 진행 막대(결과 화면의 부족 영양소, 식단 탭의 섭취량,
// 분석 카드, 상태 패널)가 이 컴포넌트 하나를 쓴다.
//
// [width가 아니라 transform: scaleX인 이유 — PRD v2.0 FR-4.3]
// "애니메이션은 transform과 opacity만 사용, 레이아웃 속성(width/height/top/left) 금지".
// width를 트랜지션하면 프레임마다 레이아웃 -> 페인트 -> 합성을 다시 거치는데, 한 화면에 막대가
// 6개씩 동시에 움직이므로 중저가 안드로이드에서 그대로 프레임 드랍으로 이어진다. scaleX는 합성 단계만
// 건드려 GPU가 처리한다.
//
// 막대 자체의 borderRadius는 그대로 두었다 — scaleX로 눌리면서 오른쪽 끝 라운드가 가로로 살짝
// 납작해지지만, 막대 높이가 6~10px이라 육안으로 구분되지 않는다(바깥 트랙의 overflow:hidden이
// 양 끝을 어차피 둥글게 잘라낸다).
export default function ProgressBarFill({ percent, color, style }) {
  const ratio = Math.max(0, Math.min(100, Number(percent) || 0)) / 100

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: color,
        borderRadius: radius.pill,
        transform: `scaleX(${ratio})`,
        transformOrigin: 'left center',
        transition: 'transform 0.3s ease-out, background 0.3s ease-out',
        willChange: 'transform',
        ...style,
      }}
    />
  )
}
