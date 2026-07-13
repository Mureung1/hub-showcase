import './ProgressBar.css'

interface ProgressBarProps {
  /** 현재 스텝 (1-based) */
  current: number
  /** 전체 스텝 수 */
  total: number
}

/** 와이어프레임 `.progress-bar` — 완료(done)/현재(current)/미완 표시 */
export default function ProgressBar({ current, total }: ProgressBarProps) {
  return (
    <div className="progress-bar">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1
        const state = step < current ? 'done' : step === current ? 'current' : ''
        return <div key={step} className={`bar ${state}`.trim()} />
      })}
    </div>
  )
}
