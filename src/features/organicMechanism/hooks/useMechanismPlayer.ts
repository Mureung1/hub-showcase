import { useEffect, useMemo, useState } from 'react'
import type { MechanismStep } from '../data/types'

/**
 * 한 프레임 = (어떤 단계, 그 단계에서 지금까지 드러낸 화살표 개수).
 * 화살표가 여러 개인 단계는 ①②③을 한 번에 다 보여주지 않고 프레임을 나눠
 * 하나씩 순차로 드러낸다 — "무엇이 무엇을 밀어내는지" 인과가 또렷해진다.
 */
interface Frame {
  step: MechanismStep
  visibleArrowCount: number
}

function buildFrames(steps: MechanismStep[]): Frame[] {
  const frames: Frame[] = []
  for (const step of steps) {
    if (step.arrows.length === 0) {
      frames.push({ step, visibleArrowCount: 0 })
    } else {
      // 화살표 1개부터 전체까지 하나씩 누적해 드러낸다.
      for (let n = 1; n <= step.arrows.length; n++) {
        frames.push({ step, visibleArrowCount: n })
      }
    }
  }
  return frames
}

export function useMechanismPlayer(steps: MechanismStep[]) {
  const frames = useMemo(() => buildFrames(steps), [steps])
  const [frameIndex, setFrameIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(2200)

  useEffect(() => {
    setFrameIndex(0)
    setPlaying(false)
  }, [frames])

  useEffect(() => {
    if (!playing) return
    if (frameIndex >= frames.length - 1) {
      setPlaying(false)
      return
    }
    const timer = setTimeout(() => {
      setFrameIndex((i) => Math.min(i + 1, frames.length - 1))
    }, speed)
    return () => clearTimeout(timer)
  }, [playing, frameIndex, speed, frames])

  const frame = frames[frameIndex] ?? frames[0]

  return {
    currentStep: frame.step,
    visibleArrowCount: frame.visibleArrowCount,
    isDone: frameIndex >= frames.length - 1,
    playing,
    stepIndex: frameIndex,
    totalSteps: frames.length,
    speed,
    setSpeed,
    play: () => setPlaying(true),
    pause: () => setPlaying(false),
    stepForward: () => setFrameIndex((i) => Math.min(i + 1, frames.length - 1)),
    reset: () => {
      setFrameIndex(0)
      setPlaying(false)
    },
  }
}
