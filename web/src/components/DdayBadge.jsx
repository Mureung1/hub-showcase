import './DdayBadge.css'

function DdayBadge({ priority, label }) {
  return <span className={`dday-badge dday-badge--${priority}`}>{label}</span>
}

export default DdayBadge
