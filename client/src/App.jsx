import { useEffect, useState } from 'react'
import CheckinForm from './components/CheckinForm'
import SummaryCard from './components/SummaryCard'
import RecordCard from './components/RecordCard'
import './App.css'

const EMPTY_SUMMARY = { emotion: '', cause: '', action: '' }

const SUMMARY_FIELDS = [
  { key: 'emotion', icon: '🙂', title: '오늘의 감정' },
  { key: 'cause', icon: '🔍', title: '감정이 남은 원인' },
  { key: 'action', icon: '🌱', title: '내일의 작은 행동' },
]

async function requestJson(url, options) {
  const response = await fetch(url, options)
  const body = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(body.error?.message || '요청을 처리하지 못했습니다.')
  }

  return body
}

function App() {
  const [rawText, setRawText] = useState('')
  const [summary, setSummary] = useState(EMPTY_SUMMARY)
  const [summarySource, setSummarySource] = useState('')
  const [checkins, setCheckins] = useState([])
  const [screen, setScreen] = useState('input')
  const [isOrganizing, setIsOrganizing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingRecords, setIsLoadingRecords] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function loadCheckins() {
    setIsLoadingRecords(true)
    try {
      const records = await requestJson('/api/checkins')
      setCheckins(records)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsLoadingRecords(false)
    }
  }

  useEffect(() => {
    loadCheckins()
  }, [])

  async function handleOrganize(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setIsOrganizing(true)

    try {
      const result = await requestJson('/api/checkins/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText }),
      })
      setSummary({
        emotion: result.emotion,
        cause: result.cause,
        action: result.action,
      })
      setSummarySource(result.source)
      setScreen('result')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsOrganizing(false)
    }
  }

  async function handleSave() {
    setError('')
    setNotice('')
    setIsSaving(true)

    try {
      const saved = await requestJson('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, ...summary }),
      })
      setCheckins((current) => [saved, ...current])
      setNotice('오늘의 체크아웃을 저장했어요.')
      setRawText('')
      setSummary(EMPTY_SUMMARY)
      setSummarySource('')
      setScreen('input')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  function updateSummary(key, value) {
    setSummary((current) => ({ ...current, [key]: value }))
  }

  function retry() {
    setError('')
    setNotice('')
    setSummarySource('')
    setScreen('input')
  }

  const canSave = SUMMARY_FIELDS.every(({ key }) => summary[key].trim())

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-mark" aria-hidden="true">✓</div>
        <div>
          <p className="eyebrow">HARU CHECKOUT</p>
          <h1>하루 체크아웃</h1>
        </div>
      </header>

      <section className="workspace" aria-live="polite">
        {screen === 'input' ? (
          <CheckinForm
            rawText={rawText}
            onTextChange={setRawText}
            onSubmit={handleOrganize}
            isOrganizing={isOrganizing}
          />
        ) : (
          <section className="result-panel">
            <div className="result-meta">
              <p className="eyebrow">정리 결과</p>
              <span className={`source-badge source-${summarySource}`}>
                {summarySource === 'ai' ? 'Vertex AI로 정리됨' : 'mock 결과로 정리됨'}
              </span>
            </div>
            <h2>오늘의 마음을 세 가지로 정리했어요.</h2>
            <p className="lead">내용을 직접 고친 뒤 저장할 수 있어요.</p>
            <div className="summary-grid">
              {SUMMARY_FIELDS.map(({ key, icon, title }) => (
                <SummaryCard
                  key={key}
                  icon={icon}
                  title={title}
                  value={summary[key]}
                  onChange={(value) => updateSummary(key, value)}
                />
              ))}
            </div>
            <div className="result-actions">
              <button className="button button-secondary" type="button" onClick={retry}>다시 정리하기</button>
              <button className="button button-primary" type="button" onClick={handleSave} disabled={!canSave || isSaving}>
                {isSaving ? '저장하는 중…' : 'Supabase에 저장'}
              </button>
            </div>
          </section>
        )}

        {error && <p className="feedback feedback-error" role="alert">{error}</p>}
        {notice && <p className="feedback feedback-success">{notice}</p>}
      </section>

      <section className="records-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">MY RECORDS</p>
            <h2>최근 체크아웃</h2>
          </div>
          <button className="refresh-button" type="button" onClick={loadCheckins} disabled={isLoadingRecords}>새로고침</button>
        </div>

        {isLoadingRecords ? (
          <p className="empty-state">기록을 불러오는 중이에요…</p>
        ) : checkins.length === 0 ? (
          <p className="empty-state">아직 저장된 기록이 없어요. 첫 체크아웃을 남겨보세요.</p>
        ) : (
          <div className="record-list">
            {checkins.map((checkin) => (
              <RecordCard key={checkin.id} checkin={checkin} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

export default App
