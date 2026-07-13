import { useEffect, useState } from 'react'

export function useCountUp(target, active, duration = 1000) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!active) return undefined

    let start = null
    let raf

    function step(timestamp) {
      if (start === null) start = timestamp
      const progress = Math.min((timestamp - start) / duration, 1)
      setValue(Math.round(progress * target))
      if (progress < 1) raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [active, target, duration])

  return value
}
