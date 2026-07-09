import { useEffect, useState } from 'react'
import type { TreeStep } from '../types'

export function useTreePlayer(steps: TreeStep[]) {
  const [stepIndex, setStepIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(900)

  useEffect(() => {
    setStepIndex(0)
    setPlaying(false)
  }, [steps])

  useEffect(() => {
    if (!playing) return
    if (stepIndex >= steps.length - 1) {
      setPlaying(false)
      return
    }
    const timer = setTimeout(() => {
      setStepIndex((i) => Math.min(i + 1, steps.length - 1))
    }, speed)
    return () => clearTimeout(timer)
  }, [playing, stepIndex, speed, steps])

  return {
    step: steps[stepIndex],
    isDone: stepIndex >= steps.length - 1,
    playing,
    stepIndex,
    totalSteps: steps.length,
    speed,
    setSpeed,
    play: () => setPlaying(true),
    pause: () => setPlaying(false),
    stepForward: () => setStepIndex((i) => Math.min(i + 1, steps.length - 1)),
    reset: () => {
      setStepIndex(0)
      setPlaying(false)
    },
  }
}
