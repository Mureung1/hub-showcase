import { Link } from 'react-router-dom'
import TagBadge from './TagBadge.jsx'
import { daysLeft } from '../data/challenges.js'
import { genreOfGame, lensOfGame } from '../data/gameSystems.js'
import './components.css'

// 채점 기준은 [{label, weight, hint}]가 표준이지만, 옛 문자열 배열도 깨지지 않게 읽는다.
function normalizeCriterion(c) {
  return typeof c === 'string' ? { label: c } : c
}

// 참가하기 링크 — 챌린지가 대상 게임/시스템/분류를 알고 있으면 에디터에 미리 채워준다.
// (EditorPage가 이미 ?game=&system=&category= 를 읽으므로 추가 배선이 필요 없다.)
function writeHref(challenge) {
  const params = new URLSearchParams({ challenge: challenge.id })
  if (challenge.gameTag) params.set('game', challenge.gameTag)
  if (challenge.systemTag) params.set('system', challenge.systemTag)
  if (challenge.category) params.set('category', challenge.category)
  return `/write/${challenge.templateId}?${params.toString()}`
}

function ChallengeCard({ challenge, compact = false }) {
  const ongoing = challenge.status === 'ongoing'
  const dday = ongoing ? daysLeft(challenge.submitDeadline) : null
  const criteria = (challenge.criteria ?? []).map(normalizeCriterion)
  // 역기획 챌린지는 대상 게임의 장르 렌즈를 함께 보여준다(장르마다 볼 것이 다르므로).
  const lens = challenge.gameTag ? lensOfGame(challenge.gameTag) : null
  const genre = challenge.gameTag ? genreOfGame(challenge.gameTag) : null

  return (
    <article className={`rs-card rs-challenge-card${ongoing ? ' is-ongoing' : ''}`}>
      <div className="rs-challenge-head">
        <TagBadge tone={ongoing ? 'gold' : 'default'}>
          {ongoing ? `진행 중 · 마감 D-${dday}` : '종료'}
        </TagBadge>
        {challenge.kind && (
          <TagBadge>{challenge.kind === 'forward' ? '순기획' : '역기획'}</TagBadge>
        )}
        {challenge.difficulty && <TagBadge>{challenge.difficulty}</TagBadge>}
        <span className="rs-challenge-dates">
          {challenge.startAt} ~ {challenge.submitDeadline}
        </span>
      </div>
      <h3 className="rs-challenge-title">{challenge.title}</h3>
      {!compact && <p className="rs-challenge-desc">{challenge.description}</p>}

      {!compact && criteria.length > 0 && (
        <div className="rs-challenge-block">
          <span className="rs-challenge-block-label">AI 채점 기준 · 배점</span>
          <ul className="rs-criteria-list">
            {criteria.map((c) => (
              <li key={c.label}>
                <span className="rs-criterion-head">
                  <strong>{c.label}</strong>
                  {c.weight != null && <span className="rs-criterion-weight">{c.weight}점</span>}
                </span>
                {c.hint && <span className="rs-criterion-hint">{c.hint}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!compact && challenge.exampleTopics?.length > 0 && (
        <div className="rs-challenge-block">
          <span className="rs-challenge-block-label">이런 걸 다루면 좋아요</span>
          <ul className="rs-topic-list">
            {challenge.exampleTopics.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      {!compact && lens && (
        <div className="rs-challenge-block">
          <span className="rs-challenge-block-label">{genre} 장르에서 꼭 짚을 것</span>
          <ul className="rs-topic-list">
            {lens.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      )}

      {(ongoing || challenge.exampleDocId) && (
        <div className="rs-challenge-actions">
          {ongoing && (
            <Link to={writeHref(challenge)} className="rs-btn rs-btn-primary">
              참가하기
            </Link>
          )}
          {challenge.exampleDocId && (
            <Link to={`/archive/${challenge.exampleDocId}`} className="rs-btn">
              예시 확인하기
            </Link>
          )}
          {ongoing && (
            <span className="rs-challenge-note">마감 전까지 타인 제출작은 비공개예요</span>
          )}
        </div>
      )}
    </article>
  )
}

export default ChallengeCard
