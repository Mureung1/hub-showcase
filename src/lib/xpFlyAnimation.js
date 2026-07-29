// 홈 화면 XP 획득 연출(FR-12) — confetti.js와 같은 명령형 DOM 함수. 매번 다른 화면 좌표(저장 버튼
// 자리 -> #home-level-pill)를 오가야 해서 정적 CSS @keyframe으로는 표현할 수 없어 Web Animations
// API(Element.animate)를 쓴다 — 그래도 transform/opacity만 애니메이션한다는 프로젝트 규칙은 그대로
// 지킨다.
//
// 좌표 보간(어느 지점을 지나 날아가는지)만 순수 함수로 분리해 DOM 없이도 테스트할 수 있게 한다.
export function buildXpFlyKeyframes(fromRect, toRect) {
  const dx = toRect.x - fromRect.x
  const dy = toRect.y - fromRect.y
  return [
    { transform: 'translate(0, 0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 30}px) scale(1.1)`, opacity: 1, offset: 0.5 },
    { transform: `translate(${dx}px, ${dy}px) scale(0.6)`, opacity: 0 },
  ]
}

// fromRect/toRect: { x, y } (DOMRect도 그대로 넘길 수 있다 — x/y만 읽는다). amount: 화면에 보여줄 XP.
export function playXpFly({ fromRect, toRect, amount, durationMs = 700 }) {
  if (typeof document === 'undefined') return
  if (!Number.isFinite(amount) || amount <= 0) return
  if (!fromRect || !toRect) return

  const el = document.createElement('div')
  el.textContent = `+${amount} XP`
  el.style.cssText = 'position:fixed;z-index:9999;pointer-events:none;font-weight:800;font-size:14px;color:#059669;'
  el.style.left = `${fromRect.x}px`
  el.style.top = `${fromRect.y}px`
  document.body.appendChild(el)

  // Element.animate 미지원 환경(jsdom, 일부 구형 WebView)에서는 애니메이션 없이 조용히 정리한다 —
  // confetti.js가 canvas getContext 미지원 시 취하는 것과 같은 방어 패턴이다.
  if (typeof el.animate !== 'function') {
    el.remove()
    return
  }

  const animation = el.animate(buildXpFlyKeyframes(fromRect, toRect), {
    duration: durationMs,
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  })
  animation.onfinish = () => el.remove()
}
