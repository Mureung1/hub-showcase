import { ChangeEvent, useEffect, useMemo, useState } from 'react'

type ActivityType = '운동' | '공부' | '생활' | '취미'

const activityCopy: Record<ActivityType, string> = {
  운동: '나는 소파에서 열심히 응원했다.',
  공부: '나는 책상 밑에서 조용히 졸았다.',
  생활: '나는 옆에서 꼼꼼하게 지켜봤다.',
  취미: '나도 슬쩍 따라 해보고 싶어졌다.',
}

const reactions = [
  { icon: '✦', label: '멋져', color: 'mint' },
  { icon: '♥', label: '좋아', color: 'coral' },
  { icon: '●', label: '열심', color: 'yellow' },
]

function objectParticle(word: string) {
  const lastCharacter = word.trim().at(-1)
  if (!lastCharacter) return '을'

  const code = lastCharacter.charCodeAt(0)
  const isHangulSyllable = code >= 0xac00 && code <= 0xd7a3
  const hasFinalConsonant = isHangulSyllable && (code - 0xac00) % 28 !== 0
  return hasFinalConsonant ? '을' : '를'
}

export function DodoDiary() {
  const [activityType, setActivityType] = useState<ActivityType>('운동')
  const [activity, setActivity] = useState('저녁 운동')
  const [minutes, setMinutes] = useState(40)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [isSample, setIsSample] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  const [reacted, setReacted] = useState<number[]>([0, 1])
  const [eyeCount, setEyeCount] = useState<1 | 2>(2)

  useEffect(() => {
    if (!videoFile) {
      setVideoUrl('')
      return
    }

    const nextUrl = URL.createObjectURL(videoFile)
    setVideoUrl(nextUrl)
    return () => URL.revokeObjectURL(nextUrl)
  }, [videoFile])

  const diaryText = useMemo(() => {
    const task = activity.trim() || activityType
    return `오늘 주인은 ${minutes}분 동안 ${task}${objectParticle(task)} 했다. ${activityCopy[activityType]}`
  }, [activity, activityType, minutes])

  const handleVideo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setVideoFile(file)
    setIsSample(false)
    setIsComplete(false)
  }

  const toggleReaction = (index: number) => {
    setReacted((current) =>
      current.includes(index)
        ? current.filter((reaction) => reaction !== index)
        : [...current, index],
    )
  }

  const reset = () => {
    setVideoFile(null)
    setIsSample(false)
    setIsComplete(false)
    setReacted([0, 1])
  }

  return (
    <section className="diary-feature" id="top">
      <div className="intro-copy">
        <span className="eyebrow">TODAY WITH DODO</span>
        <h1>
          오늘 한 일을<br />
          <em>두두가 기억해요.</em>
        </h1>
        <p>짧은 영상으로 인증하면 두두가 당신의 하루를 귀여운 일기로 남겨줄게요.</p>
      </div>

      <div className={`feature-card ${isComplete ? 'is-complete' : ''}`}>
        <div className="form-panel">
          <div className="step-label">
            <span>{isComplete ? 'DONE' : 'STEP 01'}</span>
            <p>{isComplete ? '오늘도 멋지게 해냈어요!' : '어떤 일을 해냈나요?'}</p>
          </div>

          {!isComplete ? (
            <>
              <div className="activity-tabs" aria-label="활동 종류">
                {(['운동', '공부', '생활', '취미'] as ActivityType[]).map((type) => (
                  <button
                    className={activityType === type ? 'active' : ''}
                    key={type}
                    type="button"
                    onClick={() => setActivityType(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <label className="field-label" htmlFor="activity">
                활동 이름
              </label>
              <input
                id="activity"
                className="text-input"
                value={activity}
                onChange={(event) => setActivity(event.target.value)}
                maxLength={24}
                placeholder="예: 저녁 운동"
              />

              <label className="field-label" htmlFor="minutes">
                얼마나 했나요?
              </label>
              <div className="duration-input">
                <button
                  type="button"
                  aria-label="10분 줄이기"
                  onClick={() => setMinutes((value) => Math.max(10, value - 10))}
                >
                  −
                </button>
                <input
                  id="minutes"
                  type="number"
                  min="10"
                  max="600"
                  step="10"
                  value={minutes}
                  onChange={(event) => setMinutes(Math.max(10, Number(event.target.value)))}
                />
                <span>분</span>
                <button
                  type="button"
                  aria-label="10분 늘리기"
                  onClick={() => setMinutes((value) => Math.min(600, value + 10))}
                >
                  +
                </button>
              </div>

              <label className={`video-drop ${videoFile || isSample ? 'has-video' : ''}`}>
                <input type="file" accept="video/*" onChange={handleVideo} />
                {videoFile || isSample ? (
                  <>
                    <span className="video-check">✓</span>
                    <span className="video-info">
                      <strong>{videoFile?.name ?? '두두의 샘플 영상.mp4'}</strong>
                      <small>{isSample ? '샘플 영상이 준비됐어요' : '영상이 준비됐어요 · 눌러서 변경'}</small>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="camera-icon" aria-hidden="true">
                      <i />
                    </span>
                    <span>
                      <strong>인증 영상 올리기</strong>
                      <small>오늘의 순간을 짧게 남겨주세요</small>
                    </span>
                  </>
                )}
              </label>
              {!videoFile && !isSample && (
                <button
                  className="sample-button"
                  type="button"
                  onClick={() => setIsSample(true)}
                >
                  영상 없이 샘플로 체험하기
                </button>
              )}

              <div className="visibility-row">
                <span className="friend-stack" aria-hidden="true">
                  <i>수</i><i>민</i><i>유</i>
                </span>
                <span>친한 친구 6명에게 공개</span>
                <button type="button" aria-label="공개 범위 변경">변경</button>
              </div>

              <button
                className="complete-button"
                type="button"
                disabled={(!videoFile && !isSample) || !activity.trim()}
                onClick={() => setIsComplete(true)}
              >
                인증 완료하고 일기 만들기
                <span aria-hidden="true">→</span>
              </button>
            </>
          ) : (
            <div className="success-summary">
              <div className="earned-points">
                <span>오늘의 보상</span>
                <strong><b>✦</b> +{20 + reacted.length * 5}</strong>
                <small>인증 20 · 친구 반응 +{reacted.length * 5}</small>
              </div>
              <p>친구들의 눈빛 반응</p>
              <div className="reaction-row">
                {reactions.map((reaction, index) => (
                  <button
                    type="button"
                    key={reaction.label}
                    className={`${reaction.color} ${reacted.includes(index) ? 'selected' : ''}`}
                    onClick={() => toggleReaction(index)}
                    aria-pressed={reacted.includes(index)}
                  >
                    <span>{reaction.icon}</span>
                    {reaction.label}
                  </button>
                ))}
              </div>
              <button className="reset-button" type="button" onClick={reset}>
                다른 활동 기록하기
              </button>
            </div>
          )}
        </div>

        <div className="dodo-panel">
          <div className="eye-variant-control" role="group" aria-label="두두 눈 개수 선택">
            <span>EYE TYPE</span>
            <button
              type="button"
              className={eyeCount === 1 ? 'active' : ''}
              aria-pressed={eyeCount === 1}
              onClick={() => setEyeCount(1)}
            >
              <i>●</i> 하나
            </button>
            <button
              type="button"
              className={eyeCount === 2 ? 'active' : ''}
              aria-pressed={eyeCount === 2}
              onClick={() => setEyeCount(2)}
            >
              <i>●●</i> 둘
            </button>
          </div>
          <div className="room-decoration room-star">✦</div>
          <div className="room-decoration room-plant">
            <i /><i /><i />
          </div>

          <div className={`dodo eye-count-${eyeCount} ${isComplete ? 'celebrate' : ''}`} aria-label={`눈이 ${eyeCount}개인 두두 캐릭터`}>
            <div className="dodo-shadow" />
            <div className="dodo-body">
              <div className={`dodo-eye ${eyeCount === 2 ? 'eye-left' : ''}`}>
                <div className="dodo-pupil"><i /></div>
              </div>
              {eyeCount === 2 && (
                <div className="dodo-eye eye-right">
                  <div className="dodo-pupil"><i /></div>
                </div>
              )}
              <div className="dodo-cheek left" />
              <div className="dodo-cheek right" />
              {isComplete && <div className="dodo-smile" />}
            </div>
            <div className="dodo-foot left" />
            <div className="dodo-foot right" />
          </div>

          {isComplete ? (
            <article className="diary-note" aria-live="polite">
              <div className="diary-heading">
                <span>두두의 오늘 일기</span>
                <time>7월 6일</time>
              </div>
              <blockquote>“{diaryText}”</blockquote>
              <footer>
                <span>오늘도 네 편, 두두</span>
                <span className="tiny-eyes" aria-hidden="true">● ●</span>
              </footer>
            </article>
          ) : (
            <div className="dodo-bubble">
              <span>●</span>
              영상을 기다리고 있어!
            </div>
          )}

          {videoUrl && (
            <video className="video-preview" src={videoUrl} muted playsInline controls={isComplete} />
          )}
        </div>
      </div>

      <p className="privacy-note">
        <span aria-hidden="true">◇</span>
        영상은 선택한 친구에게만 공개되며 언제든 삭제할 수 있어요.
      </p>
    </section>
  )
}
