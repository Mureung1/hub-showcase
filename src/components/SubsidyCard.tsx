import type { Subsidy } from '@hub/shared'
import { getDdayClass } from '../utils/dday'
import './SubsidyCard.css'

interface SubsidyCardProps {
  subsidy: Subsidy
  onClick: () => void
}

/** 와이어프레임 `.home-card` — 지원금 리스트 카드 */
export default function SubsidyCard({ subsidy, onClick }: SubsidyCardProps) {
  const ddayClass = getDdayClass(subsidy.dday)

  return (
    <button type="button" className="home-card" onClick={onClick}>
      <div className="home-card-top">
        <div className="home-card-title">{subsidy.name}</div>
        <span className={`dday ${ddayClass}`}>D-{subsidy.dday}</span>
      </div>
      <div className="home-card-meta">
        {subsidy.org} · {subsidy.amount}
      </div>
      <div className="home-card-bottom">
        <span className="match">매칭도 {subsidy.match}%</span>
      </div>
    </button>
  )
}
