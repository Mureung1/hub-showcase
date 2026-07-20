import { calculateProgressPercent } from '../lib/progressPercent.ts'
import './ProgressBar.css'

type ProgressBarProps = {
  completed: number
  total: number
}

function ProgressBar({ completed, total }: ProgressBarProps) {
  const percent = calculateProgressPercent(completed, total)

  return (
    <div className="progress-bar">
      <div className="progress-bar__track">
        <div className="progress-bar__fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

export default ProgressBar
