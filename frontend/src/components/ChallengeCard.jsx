import { Link } from 'react-router-dom'
import TagBadge from './TagBadge.jsx'
import { daysLeft } from '../data/challenges.js'
import './components.css'

function ChallengeCard({ challenge, compact = false }) {
  const ongoing = challenge.status === 'ongoing'
  const dday = ongoing ? daysLeft(challenge.submitDeadline) : null

  return (
    <article className={`rs-card rs-challenge-card${ongoing ? ' is-ongoing' : ''}`}>
      <div className="rs-challenge-head">
        <TagBadge tone={ongoing ? 'gold' : 'default'}>
          {ongoing ? `진행 중 · 마감 D-${dday}` : '종료'}
        </TagBadge>
        <span className="rs-challenge-dates">
          {challenge.startAt} ~ {challenge.submitDeadline}
        </span>
      </div>
      <h3 className="rs-challenge-title">{challenge.title}</h3>
      {!compact && <p className="rs-challenge-desc">{challenge.description}</p>}
      {ongoing && (
        <div className="rs-challenge-actions">
          <Link
            to={`/write/${challenge.templateId}?challenge=${challenge.id}`}
            className="rs-btn rs-btn-primary"
          >
            참가하기
          </Link>
          <span className="rs-challenge-note">마감 전까지 타인 제출작은 비공개예요</span>
        </div>
      )}
    </article>
  )
}

export default ChallengeCard
