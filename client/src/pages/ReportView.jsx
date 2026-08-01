import { useMemo, useState } from 'react'
import { buildEmotionReport, shortDate } from '../utils/emotionReport'

function ReportView({ checkins, isLoading, onRefresh }) {
  const report = useMemo(() => buildEmotionReport(checkins), [checkins])
  const [copyStatus, setCopyStatus] = useState('')

  async function copyReport() {
    if (!navigator.clipboard?.writeText) {
      setCopyStatus('이 브라우저에서는 복사 기능을 사용할 수 없어요.')
      return
    }

    try {
      await navigator.clipboard.writeText(report.copyText)
      setCopyStatus('리포트를 복사했어요.')
    } catch {
      setCopyStatus('리포트를 복사하지 못했어요.')
    }
  }

  if (isLoading) {
    return <p className="empty-state">리포트를 만들 기록을 불러오는 중이에요…</p>
  }

  if (!report.total) {
    return (
      <div className="empty-state">
        <p>저장된 기록이 생기면 이곳에서 감정 흐름을 모아볼 수 있어요.</p>
        <button className="refresh-button" type="button" onClick={onRefresh}>새로고침</button>
      </div>
    )
  }

  const maxMoodCount = report.moods[0]?.count || 1

  return (
    <section className="report-screen">
      <div className="report-heading">
        <div>
          <p className="eyebrow">나의 감정 리포트</p>
          <h2>쌓인 기록을 한눈에 모았어요.</h2>
        </div>
        <button className="refresh-button" type="button" onClick={onRefresh}>새로고침</button>
      </div>
      <p className="report-range">{report.dateRange}</p>
      <p className="report-privacy">새로운 AI 요청 없이 현재 저장된 기록만 모아서 보여줘요.</p>

      <div className="report-metrics">
        <div>
          <strong>{report.total}</strong>
          <span>전체 기록</span>
        </div>
        <div>
          <strong>{report.organizedCount}</strong>
          <span>AI 정리 기록</span>
        </div>
      </div>

      <section className="report-section">
        <h3>한눈에 보는 요약</h3>
        <p className="report-overview">{report.overviewText}</p>
      </section>

      <section className="report-section">
        <h3>최근 기록 흐름</h3>
        <div className="report-timeline">
          {report.timeline.map((checkin) => (
            <article key={checkin.id}>
              <span className="timeline-mood" aria-hidden="true">{checkin.mood || '📝'}</span>
              <time dateTime={checkin.createdAt}>{shortDate(checkin.createdAt)}</time>
              <strong>{checkin.emotion || 'AI 미정리'}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="report-section">
        <h3>기분 분포</h3>
        {report.moods.length ? (
          <div className="mood-report-list">
            {report.moods.map(({ mood, count }) => (
              <div className="mood-report-row" key={mood}>
                <span className="mood-report-icon" aria-hidden="true">{mood}</span>
                <div className="mood-report-track">
                  <span style={{ width: `${(count / maxMoodCount) * 100}%` }} />
                </div>
                <strong>{count}회</strong>
              </div>
            ))}
          </div>
        ) : <p className="report-empty">기분을 선택한 기록이 아직 없어요.</p>}
      </section>

      <section className="report-section">
        <h3>최근 정리된 감정과 원인</h3>
        {report.recent.length ? (
          <div className="report-summary-list">
            {report.recent.map((checkin) => (
              <article key={checkin.id}>
                <time dateTime={checkin.createdAt}>{shortDate(checkin.createdAt)}</time>
                <strong>{checkin.emotion || '감정 미정리'}</strong>
                {checkin.cause && <p>{checkin.cause}</p>}
              </article>
            ))}
          </div>
        ) : <p className="report-empty">AI로 정리한 기록이 생기면 여기에 표시돼요.</p>}
      </section>

      <section className="report-section">
        <h3>작은 행동 모아보기</h3>
        {report.actions.length ? (
          <ul className="action-report-list">
            {report.actions.map((action) => <li key={action}>{action}</li>)}
          </ul>
        ) : <p className="report-empty">저장된 작은 행동이 아직 없어요.</p>}
      </section>

      <button className="button button-primary report-copy" type="button" onClick={copyReport}>
        리포트 텍스트 복사
      </button>
      {copyStatus && <p className="report-copy-status" aria-live="polite">{copyStatus}</p>}
    </section>
  )
}

export default ReportView
