import { describe, it, expect } from 'vitest'
import { createParticles, playConfetti } from './confetti.js'

describe('createParticles', () => {
  it('요청한 개수만큼 만든다', () => {
    expect(createParticles(60, 800)).toHaveLength(60)
  })

  it('0개를 요청하면 빈 배열이다', () => {
    expect(createParticles(0, 800)).toEqual([])
  })

  it('x는 항상 0~canvasWidth 범위 안이다', () => {
    const particles = createParticles(200, 500)
    for (const p of particles) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThan(500)
    }
  })

  it('모든 파티클은 화면 위쪽(y=-20)에서 시작해 아래로 떨어질 초기 속도(vy>0)를 가진다', () => {
    const particles = createParticles(30, 500)
    for (const p of particles) {
      expect(p.y).toBe(-20)
      expect(p.vy).toBeGreaterThan(0)
    }
  })
})

describe('playConfetti', () => {
  it('jsdom처럼 2d 컨텍스트를 못 얻는 환경에서도 예외 없이 캔버스를 정리한다', () => {
    // jsdom은 기본적으로 canvas.getContext('2d')가 null이라 이 경로를 자연히 탄다.
    expect(() => playConfetti()).not.toThrow()
    expect(document.querySelectorAll('canvas')).toHaveLength(0)
  })

  it('document가 없는 환경(SSR 등)에서도 조용히 아무 것도 안 한다', () => {
    const originalDocument = global.document
    global.document = undefined
    expect(() => playConfetti()).not.toThrow()
    global.document = originalDocument
  })
})
