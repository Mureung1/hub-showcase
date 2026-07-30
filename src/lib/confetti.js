// 끼니 저장 성공 시 짧게 재생하는 축하 효과. 외부 라이브러리 없이 직접 구현한다 —
// interaction-guide.md의 "모션은 CSS/캔버스로, 라이브러리는 피한다" 원칙(framer-motion을 번들
// 크기 때문에 거절한 전례)을 그대로 따른다. Math.random()은 여기선 순수 시각 효과라 이 프로젝트의
// "결정적 로직에 Math.random/Date.now 금지" 규칙(미션 선택 등 데이터 로직 대상)과는 무관하다.
const COLORS = ['#059669', '#FF9F1C', '#3182F6', '#F04452', '#FFD43B']

// 순수 함수로 분리 — 파티클 생성 로직만 단위 테스트할 수 있게.
export function createParticles(count, canvasWidth) {
  return Array.from({ length: count }, () => ({
    x: Math.random() * canvasWidth,
    y: -20,
    vx: (Math.random() - 0.5) * 4,
    vy: Math.random() * 3 + 2,
    size: Math.random() * 6 + 4,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 10,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  }))
}

function stepParticle(p) {
  p.x += p.vx
  p.y += p.vy
  p.rotation += p.rotationSpeed
}

function drawParticle(ctx, p) {
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate((p.rotation * Math.PI) / 180)
  ctx.fillStyle = p.color
  ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
  ctx.restore()
}

export function playConfetti({ durationMs = 1500, particleCount = 60 } = {}) {
  if (typeof document === 'undefined') return

  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;'
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  // 2d 컨텍스트를 못 얻는 환경(예: 캔버스를 지원하지 않는 초구형 WebView)에서는 조용히 정리하고
  // 넘어간다 — 컨페티는 부가 연출이라 여기서 예외가 나서 저장 흐름 자체를 막으면 안 된다.
  if (!ctx) {
    canvas.remove()
    return
  }

  const particles = createParticles(particleCount, canvas.width)
  const start = performance.now()

  function frame(now) {
    const elapsed = now - start
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (const p of particles) {
      stepParticle(p)
      drawParticle(ctx, p)
    }
    if (elapsed < durationMs) {
      requestAnimationFrame(frame)
    } else {
      canvas.remove()
    }
  }
  requestAnimationFrame(frame)
}
