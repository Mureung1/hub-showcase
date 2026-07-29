import { describe, it, expect, vi, afterEach } from 'vitest'
import { buildXpFlyKeyframes, playXpFly } from './xpFlyAnimation.js'

const FROM = { x: 100, y: 500 }
const TO = { x: 20, y: 40 }

describe('buildXpFlyKeyframes', () => {
  it('시작/중간/끝 좌표를 dx/dy 기준으로 보간한다', () => {
    const frames = buildXpFlyKeyframes(FROM, TO)
    expect(frames).toHaveLength(3)
    expect(frames[0]).toEqual({ transform: 'translate(0, 0) scale(1)', opacity: 1 })
    const dx = TO.x - FROM.x // -80
    const dy = TO.y - FROM.y // -460
    expect(frames[1].transform).toBe(`translate(${dx * 0.5}px, ${dy * 0.5 - 30}px) scale(1.1)`)
    expect(frames[2].transform).toBe(`translate(${dx}px, ${dy}px) scale(0.6)`)
    expect(frames[2].opacity).toBe(0)
  })
})

describe('playXpFly', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('amount가 0 이하면 아무 것도 하지 않는다', () => {
    playXpFly({ fromRect: FROM, toRect: TO, amount: 0 })
    expect(document.body.children).toHaveLength(0)
    playXpFly({ fromRect: FROM, toRect: TO, amount: -5 })
    expect(document.body.children).toHaveLength(0)
  })

  it('amount가 유효하지 않으면(NaN) 아무 것도 하지 않는다', () => {
    playXpFly({ fromRect: FROM, toRect: TO, amount: NaN })
    expect(document.body.children).toHaveLength(0)
  })

  it('fromRect/toRect가 없으면 아무 것도 하지 않는다', () => {
    playXpFly({ fromRect: null, toRect: TO, amount: 10 })
    expect(document.body.children).toHaveLength(0)
  })

  it('Element.animate 미지원 환경(jsdom)에서는 예외 없이 만들었다가 바로 정리한다', () => {
    // jsdom은 기본적으로 Element.prototype.animate가 없다 — 방어 분기가 타는지 확인.
    expect(typeof document.createElement('div').animate).toBe('undefined')
    expect(() => playXpFly({ fromRect: FROM, toRect: TO, amount: 15 })).not.toThrow()
    expect(document.body.children).toHaveLength(0)
  })

  it('Element.animate가 있으면 올바른 키프레임/옵션으로 호출하고, 종료 시 스스로 제거된다', () => {
    const onfinishHolder = {}
    const animateMock = vi.fn(() => {
      const anim = {}
      Object.defineProperty(anim, 'onfinish', {
        set(fn) {
          onfinishHolder.fn = fn
        },
      })
      return anim
    })
    Element.prototype.animate = animateMock

    playXpFly({ fromRect: FROM, toRect: TO, amount: 25, durationMs: 500 })
    expect(document.body.children).toHaveLength(1)
    expect(document.body.textContent).toContain('+25 XP')
    expect(animateMock).toHaveBeenCalledWith(buildXpFlyKeyframes(FROM, TO), {
      duration: 500,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    })

    onfinishHolder.fn()
    expect(document.body.children).toHaveLength(0)

    delete Element.prototype.animate
  })
})
