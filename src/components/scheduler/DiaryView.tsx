import { useEffect, useState } from 'react'
import * as dodoApi from './dodoApi'
import type { DodoDiaryEntry } from './types'

type DiaryViewProps = {
  onBack: () => void
}

function formatDiaryDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-')
  return `${year}년 ${Number(month)}월 ${Number(day)}일`
}

export function DiaryView({ onBack }: DiaryViewProps) {
  const [entries, setEntries] = useState<DodoDiaryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    dodoApi.fetchDodoDiaryList()
      .then((loaded) => {
        if (!cancelled) setEntries(loaded)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  return (
    <section className="group-manager-view" aria-labelledby="diary-title">
      <div className="tab-page-heading">
        <div>
          <button type="button" className="group-manager-back" onClick={onBack} aria-label="마이페이지로 돌아가기">←</button>
          <span>DIARY</span>
          <h1 id="diary-title">나의 기록</h1>
        </div>
      </div>

      {loading ? (
        <p className="empty-agenda">일기를 불러오는 중이에요...</p>
      ) : entries.length === 0 ? (
        <p className="empty-agenda">아직 쓰인 일기가 없어요. 영상을 인증하면 두두가 오늘의 일기를 남겨줘요.</p>
      ) : (
        <div className="group-list">
          {entries.map((entry) => (
            <article className="group-card" key={entry.id}>
              <div className="group-card-header">
                <span className="group-card-name">{formatDiaryDate(entry.date)}</span>
                {entry.mood !== null && (
                  <div className="mood-pixels" aria-label={`기분 4단계 중 ${entry.mood}단계`}>
                    {([1, 2, 3, 4] as const).map((step) => <i key={step} className={step <= entry.mood! ? 'filled' : ''} />)}
                  </div>
                )}
              </div>
              <div className="feed-video-frame">
                <video className="feed-video-real" src={entry.representativeVideoUrl} controls playsInline />
              </div>
              <p className="feed-caption">{entry.text}</p>
              {entry.pointsEarned !== null && entry.pointsEarned > 0 && (
                <p className="feed-caption">오늘 획득한 포인트 +{entry.pointsEarned}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
