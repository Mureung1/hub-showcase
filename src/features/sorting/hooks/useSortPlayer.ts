import { useEffect, useMemo, useState } from 'react'
import type { SortStep } from '../algorithms/types'

export function useSortPlayer(steps: SortStep[]) {
  const [stepIndex, setStepIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(400)

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

  const step = steps[stepIndex]

  const sortedIndices = useMemo(() => {
    const set = new Set<number>()
    for (let i = 0; i <= stepIndex; i++) {
      const s = steps[i]
      if (s.type === 'mark-sorted') set.add(s.index)
    }
    return set
  }, [steps, stepIndex])

  return {
    cells: step?.cells ?? [],
    stepType: step?.type,
    comparingIndices: step?.type === 'compare' ? step.indices : [],
    swappingIndices: step?.type === 'swap' ? step.indices : [],
    sortedIndices,
    isDone: step?.type === 'done',
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
