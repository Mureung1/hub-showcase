import { useEffect, useState } from 'react'
import type { LewisStep } from '../data/types'

export function useLewisPlayer(steps: LewisStep[]) {
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    setStepIndex(0)
  }, [steps])

  return {
    currentStep: steps[stepIndex],
    isFirst: stepIndex <= 0,
    isDone: stepIndex >= steps.length - 1,
    stepIndex,
    totalSteps: steps.length,
    stepForward: () => setStepIndex((i) => Math.min(i + 1, steps.length - 1)),
    stepBackward: () => setStepIndex((i) => Math.max(i - 1, 0)),
    reset: () => setStepIndex(0),
  }
}
