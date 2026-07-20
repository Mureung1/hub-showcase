import './ProgressBar.css'

type ProgressBarProps = {
  completed: number
  total: number
}

function ProgressBar({ completed, total }: ProgressBarProps) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="progress-bar">
      <div className="progress-bar__track">
        <div className="progress-bar__fill" style={{ width: `${percent}%` }} />
      </div>
      <span className="progress-bar__label">{percent}%</span>
    </div>
  )
}

export default ProgressBar
