import { type FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useLearningProfileStore } from '../../stores/useLearningProfileStore'
import type { LearningLevel, LearningProfile } from '../../types/profile'
import styles from './ProfileSetup.module.css'

const trackOptions = ['React', 'Python', 'FastAPI', 'BFS']
const timeOptions = [15, 30, 60]

const levelOptions: Array<{ label: string; value: LearningLevel }> = [
  { label: '입문', value: 'beginner' },
  { label: '기초', value: 'basic' },
  { label: '실전 준비', value: 'interview' },
]

export function ProfileSetup() {
  const navigate = useNavigate()
  const { profile, saveProfile, resetProfile } = useLearningProfileStore()
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '예린')
  const [learningGoal, setLearningGoal] = useState(
    profile?.learningGoal ?? 'React state와 이벤트 이해하기',
  )
  const [preferredTracks, setPreferredTracks] = useState<string[]>(
    profile?.preferredTracks ?? ['React', 'BFS'],
  )
  const [dailyStudyMinutes, setDailyStudyMinutes] = useState(profile?.dailyStudyMinutes ?? 30)
  const [level, setLevel] = useState<LearningLevel>(profile?.level ?? 'beginner')
  const [isSaved, setIsSaved] = useState(Boolean(profile))

  const canSubmit = displayName.trim().length > 0 && learningGoal.trim().length > 0

  const previewProfile = useMemo<LearningProfile>(
    () => ({
      displayName: displayName.trim() || '학습자',
      learningGoal: learningGoal.trim() || '오늘 학습 목표 설정',
      preferredTracks,
      dailyStudyMinutes,
      level,
    }),
    [dailyStudyMinutes, displayName, learningGoal, level, preferredTracks],
  )
  const primaryTrack = previewProfile.preferredTracks[0] ?? 'React'
  const levelLabel = levelOptions.find((option) => option.value === previewProfile.level)?.label ?? '입문'

  function toggleTrack(track: string) {
    setPreferredTracks((currentTracks) => {
      if (currentTracks.includes(track)) {
        const nextTracks = currentTracks.filter((item) => item !== track)
        return nextTracks.length > 0 ? nextTracks : currentTracks
      }

      return [...currentTracks, track]
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canSubmit) {
      return
    }

    saveProfile(previewProfile)
    setIsSaved(true)
    navigate('/today')
  }

  function handleReset() {
    resetProfile()
    setDisplayName('')
    setLearningGoal('')
    setPreferredTracks(['React'])
    setDailyStudyMinutes(30)
    setLevel('beginner')
    setIsSaved(false)
  }

  return (
    <section className={styles.page} aria-labelledby="profile-title">
      <form className={styles.form} onSubmit={handleSubmit}>
        <header className={styles.formHeader}>
          <p className={styles.eyebrow}>Learning Profile</p>
          <h1 id="profile-title">학습 프로필을 만들어볼까요?</h1>
          <p className={styles.description}>오늘 학습 허브를 개인화합니다.</p>
        </header>

        <label className={styles.field}>
          <span>표시 이름</span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="예: 예린"
          />
        </label>

        <label className={styles.field}>
          <span>오늘 배우고 싶은 목표</span>
          <textarea
            value={learningGoal}
            onChange={(event) => setLearningGoal(event.target.value)}
            placeholder="React state와 이벤트 이해하기"
            maxLength={100}
          />
          <small>{learningGoal.length} / 100</small>
        </label>

        <div className={styles.group}>
          <span>관심 트랙</span>
          <div className={styles.chips}>
            {trackOptions.map((track) => (
              <button
                className={preferredTracks.includes(track) ? styles.selected : ''}
                key={track}
                type="button"
                aria-pressed={preferredTracks.includes(track)}
                onClick={() => toggleTrack(track)}
              >
                <span className={styles.trackIcon} aria-hidden="true">
                  {track === 'React' ? '⚛' : track.slice(0, 1)}
                </span>
                {track}
              </button>
            ))}
          </div>
          <small>관심 있는 트랙을 1개 이상 선택해주세요.</small>
        </div>

        <div className={styles.group}>
          <span>하루 학습 시간</span>
          <div className={styles.segmented}>
            {timeOptions.map((minutes) => (
              <button
                className={dailyStudyMinutes === minutes ? styles.selected : ''}
                key={minutes}
                type="button"
                aria-pressed={dailyStudyMinutes === minutes}
                onClick={() => setDailyStudyMinutes(minutes)}
              >
                {minutes}분
              </button>
            ))}
          </div>
        </div>

        <div className={styles.group}>
          <span>현재 수준</span>
          <div className={styles.segmented}>
            {levelOptions.map((option) => (
              <button
                className={level === option.value ? styles.selected : ''}
                key={option.value}
                type="button"
                aria-pressed={level === option.value}
                onClick={() => setLevel(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.primary} disabled={!canSubmit} type="submit">
            <span aria-hidden="true">✦</span>
            오늘 학습 허브로 이동
          </button>
          <Link className={styles.secondary} to="/today">
            나중에 둘러보기
          </Link>
        </div>
      </form>

      <aside className={styles.preview} aria-label="오늘 학습 허브 미리보기">
        <header className={styles.previewTitle}>
          <span aria-hidden="true">✦</span>
          <div>
            <h2>오늘 학습 허브 미리보기</h2>
            <p>입력하신 내용을 기반으로 추천을 보여드려요.</p>
          </div>
        </header>

        <section className={styles.todayCard} aria-label="오늘의 추천">
          <div className={styles.todayHeader}>
            <h3>오늘의 추천</h3>
            <span aria-hidden="true">□</span>
          </div>

          <dl className={styles.recommendations}>
            <div>
              <dt>
                <span className={styles.metricIcon} aria-hidden="true">
                  ◔
                </span>
                학습 시간
              </dt>
              <dd>
                <strong>{previewProfile.dailyStudyMinutes}분</strong>
                <span>권장 30분</span>
              </dd>
            </div>
            <div>
              <dt>
                <span className={styles.metricIcon} aria-hidden="true">
                  {'</>'}
                </span>
                선택 트랙
              </dt>
              <dd>
                <strong>{primaryTrack}</strong>
                <span>{previewProfile.preferredTracks.join(', ')}</span>
              </dd>
            </div>
            <div>
              <dt>
                <span className={styles.metricIconWarm} aria-hidden="true">
                  ◎
                </span>
                오늘의 미션
              </dt>
              <dd>
                <strong>Counter.jsx 실습</strong>
                <span>{previewProfile.learningGoal}</span>
              </dd>
            </div>
            <div>
              <dt>
                <span className={styles.metricIconSuccess} aria-hidden="true">
                  ✓
                </span>
                복습
              </dt>
              <dd>
                <strong>복습 2개 예정</strong>
                <span>{levelLabel} 수준에 맞춰 조정</span>
              </dd>
            </div>
          </dl>
        </section>

        <section className={styles.codePreview} aria-label="미션 미리보기">
          <div className={styles.codeHeader}>
            <span>Counter.jsx</span>
            <strong>1/3</strong>
          </div>
          <pre>{`import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)

  return (
    <button onClick={() => setCount(count + 1)}>
      {count}
    </button>
  )
}`}</pre>
        </section>

        {isSaved ? <div className={styles.saved}>프로필이 저장되었습니다</div> : null}
        {profile ? (
          <button className={styles.reset} type="button" onClick={handleReset}>
            저장된 프로필 초기화
          </button>
        ) : null}
      </aside>
    </section>
  )
}
