import { Link, Navigate, useOutletContext } from 'react-router-dom'
import { DIFFICULTY_META, SKILL_LEVEL_LABELS } from '../utils/format.js'
import { LANGUAGE_OPTIONS, TOPIC_OPTIONS, buildDefaultPreferences } from '../utils/preferences.js'

// 3 · 분석 결과 + 조건 입력
function Chip({ label, on }) {
  return <span className={on ? 'chip chip-on' : 'chip'}>{label}</span>
}

function Profile() {
  const { analysis } = useOutletContext()

  if (!analysis) {
    return <Navigate to="/input" replace />
  }

  const { githubId, languages, skillLevel, activitySummary } = analysis
  const recentRepos = analysis.recentRepos ?? []
  const contributionHistory = analysis.contributionHistory ?? []
  const hasActivity = languages.length > 0
  const preferences = buildDefaultPreferences(analysis)
  const skillLabel = SKILL_LEVEL_LABELS[skillLevel]
  const difficultyLabel = DIFFICULTY_META[preferences.difficulty].label
  const topLanguages = languages
    .slice(0, 2)
    .map((language) => language.name)
    .join(' · ')

  const stats = [
    { k: '주 언어', v: topLanguages },
    { k: '추정 실력', v: skillLabel },
    { k: '커밋 · PR', v: `${activitySummary.commits} · ${activitySummary.pullRequests}` },
    { k: '기여 레포', v: `${activitySummary.contributedRepos}개` },
  ]

  return (
    <div className="panel">
      <div className="eyebrow">분석 완료</div>
      <h1 className="hero">{hasActivity ? '이런 개발자시네요' : '이제 시작하는 단계네요'}</h1>

      <div className="profile-card">
        <div className="pc-handle">@{githubId}</div>
        {hasActivity ? (
          <>
            <div className="pc-headline">{topLanguages} 중심의 개발자</div>
            <div className="pc-stats">
              {stats.map((stat) => (
                <div className="pc-stat" key={stat.k}>
                  <div className="k">{stat.k}</div>
                  <div className="v">{stat.v}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="pc-headline">아직 공개 활동이 없어요</div>
            <p className="lead">
              공개 레포·커밋이 아직 없지만 괜찮아요.
              <br />
              아래 선호 조건만으로 첫 기여 이슈를 찾아드릴게요.
            </p>
          </>
        )}
      </div>

      {recentRepos.length > 0 && (
        <div className="repo-section">
          <div className="rs-title">최근 12개월 활동 레포</div>
          <ul className="repo-list">
            {recentRepos.map((repo) => (
              <li key={repo.nameWithOwner}>
                <span className="rl-name">{repo.nameWithOwner}</span>
                <span className="rl-meta">커밋 {repo.commits}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {contributionHistory.length > 0 && (
        <div className="repo-section">
          <div className="rs-title">기여 이력 · 내 레포가 아닌 곳에 남긴 발자국</div>
          <ul className="repo-list">
            {contributionHistory.map((repo) => (
              <li key={repo.nameWithOwner}>
                <span className="rl-name">{repo.nameWithOwner}</span>
                <span className="rl-meta">⭐ {repo.stars.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="cond-intro">
        <div className="ci-title">이 조건으로 찾아드릴게요</div>
        <div className="ci-sub">
          분석 결과에 맞춰 미리 골라뒀어요. 바꾸고 싶으면 눌러서 수정하세요.
        </div>
      </div>

      <label className="label">언어</label>
      <div className="chips">
        {LANGUAGE_OPTIONS.map((label) => (
          <Chip key={label} label={label} on={preferences.languages.includes(label)} />
        ))}
      </div>

      <label className="label">
        난이도{' '}
        <span className="hint">
          · {skillLabel}이시라 '{difficultyLabel}'을 추천해요
        </span>
      </label>
      <div className="chips">
        {Object.entries(DIFFICULTY_META).map(([value, meta]) => (
          <Chip key={value} label={meta.label} on={value === preferences.difficulty} />
        ))}
      </div>

      <label className="label">
        관심 분야 <span className="hint">· 선택하지 않아도 돼요</span>
      </label>
      <div className="chips">
        {TOPIC_OPTIONS.map((topic) => (
          <Chip
            key={topic.value}
            label={topic.label}
            on={preferences.topics.includes(topic.value)}
          />
        ))}
      </div>

      <Link to="/search" className="btn btn-primary btn-block">
        이 조건으로 이슈 찾기
      </Link>
    </div>
  )
}

export default Profile
