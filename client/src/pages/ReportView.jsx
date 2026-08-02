import { useMemo, useState } from 'react'
import { buildEmotionReport, shortDate } from '../utils/emotionReport'

function ReportView({ checkins, isLoading, onRefresh, onAnalyze }) {
  const report = useMemo(() => buildEmotionReport(checkins), [checkins])
  const [copyStatus, setCopyStatus] = useState('')
  const [aiConsent, setAiConsent] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [analysisError, setAnalysisError] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)

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

  async function analyzeReport() {
    setAnalysisError('')
    setAnalysis(null)
    setIsAnalyzing(true)

    try {
      setAnalysis(await onAnalyze(report.copyText))
    } catch (error) {
      setAnalysisError(error.message)
    } finally {
      setIsAnalyzing(false)
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
      <p className="report-privacy">
        기본 리포트는 새로운 AI 요청 없이 저장된 기록만 모아요. 아래에서 동의하고 버튼을 누를 때만 요약 텍스트를 전송해요.
      </p>

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

      <section className="report-ai">
        <div>
          <p className="eyebrow">선택 기능</p>
          <h3>AI로 전체 흐름 정리</h3>
          <p>현재 보이는 리포트 요약만 보내요. 사진과 전체 원문은 보내지 않아요.</p>
        </div>
        <label className="ai-consent">
          <input
            type="checkbox"
            checked={aiConsent}
            onChange={(event) => setAiConsent(event.target.checked)}
          />
          리포트 요약을 AI 정리를 위해 서버로 보내는 데 동의해요.
        </label>
        <button
          className="button button-primary"
          type="button"
          disabled={!aiConsent || isAnalyzing}
          onClick={analyzeReport}
        >
          {isAnalyzing ? 'AI가 흐름을 정리하고 있어요…' : 'AI로 전체 흐름 정리'}
        </button>
        {analysisError && <p className="feedback feedback-error" role="alert">{analysisError}</p>}
        {analysis && (
          <div className="report-ai-results">
            <article>
              <strong>전체 흐름</strong>
              <p>{analysis.overview}</p>
            </article>
            <article>
              <strong>반복해서 보이는 장면</strong>
              <p>{analysis.pattern}</p>
            </article>
            <article>
              <strong>다음 기록에서 살펴볼 점</strong>
              <p>{analysis.nextFocus}</p>
            </article>
          </div>
        )}
        <p className="report-ai-disclaimer">AI 정리는 의료적 진단이나 상담을 대신하지 않아요.</p>
      </section>
    </section>
  )
}

export default ReportView
