import { useState } from 'react'
import { buildSkipMessage } from './skipMessage'

function SkipResultPanel({ reassigned, fromDayOfWeek, toDayOfWeek }) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="rounded-lg border border-border bg-panel p-6">
      <p className="mb-5 text-[15px] text-text">
        {buildSkipMessage({ reassigned, fromDayOfWeek, toDayOfWeek })}
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="rounded-pill bg-accent px-6 py-[11px] text-[14px] font-bold text-on-accent hover:bg-accent-hover"
      >
        확인
      </button>
    </div>
  )
}

export default SkipResultPanel
