import { useCallback, useEffect, useState } from 'react'
import CheckinForm from './components/CheckinForm'
import FlipCard from './components/FlipCard'
import RecordCard from './components/RecordCard'
import RecordDetail from './pages/RecordDetail'
import CalendarView from './pages/CalendarView'
import ReportView from './pages/ReportView'
import EntryScreen from './components/EntryScreen'
import { createGuestCheckinRepository, fileToDataUrl } from './services/guestCheckinRepository'
import { createSupabaseCheckinRepository } from './services/supabaseCheckinRepository'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import hero from './assets/hero.png'
import './App.css'

const EMPTY_SUMMARY = { emotion: '', cause: '', action: '' }
const EMPTY_REASONS = { emotion: '', cause: '', action: '' }
const STORAGE_MODE_KEY = 'haru-checkout-storage-mode'
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

const SUMMARY_FIELDS = [
  { key: 'emotion', icon: '🙂', title: '오늘의 감정' },
  { key: 'cause', icon: '🔍', title: '감정이 남은 원인' },
  { key: 'action', icon: '🌱', title: '내일의 작은 행동' },
]

async function requestJson(url, options) {
  const response = await fetch(`${API_BASE_URL}${url}`, options)
  const body = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(body.error?.message || '요청을 처리하지 못했습니다.')
  }

  return body
}

const guestRepository = createGuestCheckinRepository()
const cloudRepository = createSupabaseCheckinRepository(supabase)

function App() {
  const [storageMode, setStorageMode] = useState(
    () => window.localStorage.getItem(STORAGE_MODE_KEY) || '',
  )
  const [rawText, setRawText] = useState('')
  const [mood, setMood] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [aiConsent, setAiConsent] = useState(false)
  const [summary, setSummary] = useState(EMPTY_SUMMARY)
  const [reasons, setReasons] = useState(EMPTY_REASONS)
  const [summarySource, setSummarySource] = useState('')
  const [checkins, setCheckins] = useState([])
  const [screen, setScreen] = useState('input')
  const [detailReturn, setDetailReturn] = useState('input')
  const [selectedCheckin, setSelectedCheckin] = useState(null)
  const [isOrganizing, setIsOrganizing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingRecords, setIsLoadingRecords] = useState(Boolean(storageMode))
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [session, setSession] = useState(null)
  const [isAuthReady, setIsAuthReady] = useState(!supabase)
  const [guestRecordsForSync, setGuestRecordsForSync] = useState([])
  const [isSyncing, setIsSyncing] = useState(false)
  const activeRepository = storageMode === 'cloud' ? cloudRepository : guestRepository

  useEffect(() => {
    if (!supabase) {
      return undefined
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (storageMode === 'cloud' && !data.session) {
        window.localStorage.removeItem(STORAGE_MODE_KEY)
        setStorageMode('')
      }
      setIsAuthReady(true)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [storageMode])

  const loadCheckins = useCallback(async () => {
    if (!storageMode || (storageMode === 'cloud' && !session)) {
      return
    }

    setIsLoadingRecords(true)
    try {
      const records = await activeRepository.getCheckins()
      setCheckins(records)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsLoadingRecords(false)
    }
  }, [activeRepository, session, storageMode])

  useEffect(() => {
    loadCheckins()
  }, [loadCheckins])

  useEffect(() => {
    if (storageMode !== 'cloud' || !session) {
      setGuestRecordsForSync([])
      return
    }

    guestRepository.getCheckins()
      .then(setGuestRecordsForSync)
      .catch(() => setGuestRecordsForSync([]))
  }, [session, storageMode])

  function startGuestMode() {
    window.localStorage.setItem(STORAGE_MODE_KEY, 'guest')
    setError('')
    setNotice('')
    setStorageMode('guest')

    if (navigator.storage?.persist) {
      navigator.storage.persist().catch(() => {})
    }
  }

  function startCloudMode(nextSession) {
    window.localStorage.setItem(STORAGE_MODE_KEY, 'cloud')
    setSession(nextSession)
    setStorageMode('cloud')
    setError('')
    setNotice('')
  }

  async function showStorageOptions() {
    if (storageMode === 'cloud' && supabase) {
      await supabase.auth.signOut()
    }
    window.localStorage.removeItem(STORAGE_MODE_KEY)
    setStorageMode('')
    setRawText('')
    setMood('')
    setPhotoFile(null)
    setAiConsent(false)
    setSummary(EMPTY_SUMMARY)
    setReasons(EMPTY_REASONS)
    setSummarySource('')
    setSelectedCheckin(null)
    setScreen('input')
    setError('')
    setNotice('')
  }

  async function handleOrganize(event) {
    event.preventDefault()
    setError('')
    setNotice('')

    if (!aiConsent) {
      setError('AI 정리를 사용하려면 서버 전송 안내를 확인해 주세요.')
      return
    }

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
      setReasons({
        emotion: result.emotionReason || '',
        cause: result.causeReason || '',
        action: result.actionReason || '',
      })
      setSummarySource(result.source)
      setScreen('result')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsOrganizing(false)
    }
  }

  async function saveCheckin(summaryToSave) {
    setError('')
    setNotice('')
    setIsSaving(true)

    try {
      const checkin = {
        rawText,
        mood: mood || undefined,
        ...summaryToSave,
      }
      let saved

      if (storageMode === 'guest') {
        const imageUrl = await fileToDataUrl(photoFile)
        saved = await guestRepository.createCheckin({
          ...checkin,
          imageUrl,
        })
      } else {
        saved = await activeRepository.createCheckin(checkin, photoFile)
      }

      setCheckins((current) => [saved, ...current])
      setNotice(storageMode === 'guest'
        ? '오늘의 체크아웃을 이 기기에 저장했어요.'
        : '오늘의 체크아웃을 클라우드에 저장했어요.')
      setRawText('')
      setMood('')
      setPhotoFile(null)
      setAiConsent(false)
      setSummary(EMPTY_SUMMARY)
      setReasons(EMPTY_REASONS)
      setSummarySource('')
      setScreen('input')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  function handlePhotoChange(file) {
    if (file && file.size > 5 * 1024 * 1024) {
      setError('사진은 5MB 이하만 첨부할 수 있어요.')
      return
    }
    setError('')
    setPhotoFile(file)
  }

  function updateSummary(key, value) {
    setSummary((current) => ({ ...current, [key]: value }))
  }

  function openDetail(checkin) {
    setError('')
    setNotice('')
    setSelectedCheckin(checkin)
    setDetailReturn(screen === 'calendar' ? 'calendar' : 'input')
    setScreen('detail')
  }

  function backToList() {
    setSelectedCheckin(null)
    setScreen(detailReturn)
  }

  async function handleDeleteCheckin(id) {
    setError('')
    setNotice('')
    try {
      await activeRepository.deleteCheckin(id)
      setCheckins((current) => current.filter((c) => c.id !== id))
      setNotice('기록을 삭제했어요.')
      backToList()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  function analyzeReport(reportText) {
    return requestJson('/api/checkins/report-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportText }),
    })
  }

  function handleSave() {
    return saveCheckin(summary)
  }

  function handleSaveWithoutAi() {
    return saveCheckin(EMPTY_SUMMARY)
  }

  async function handleSyncGuestRecords() {
    if (!guestRecordsForSync.length) {
      return
    }

    const shouldSync = window.confirm(
      `이 기기의 기록 ${guestRecordsForSync.length}개를 클라우드에 복사할까요?\n사진은 기기에만 남고, 원문·기분·AI 정리 결과만 복사돼요.`,
    )
    if (!shouldSync) {
      return
    }

    setError('')
    setNotice('')
    setIsSyncing(true)
    try {
      await cloudRepository.syncGuestCheckins(guestRecordsForSync)
      await loadCheckins()
      setNotice(`기기 기록 ${guestRecordsForSync.length}개를 클라우드에 복사했어요. 원본은 이 기기에 그대로 남아 있어요.`)
      setGuestRecordsForSync([])
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSyncing(false)
    }
  }

  async function handleClearCheckins() {
    if (!window.confirm('이 기기에 저장된 기록을 모두 삭제할까요? 삭제하면 되돌릴 수 없어요.')) {
      return
    }

    setError('')
    setNotice('')
    try {
      await activeRepository.clearCheckins()
      setCheckins([])
      setSelectedCheckin(null)
      setNotice('이 기기의 기록을 모두 삭제했어요.')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  function switchTab(nextScreen) {
    setError('')
    setNotice('')
    setSelectedCheckin(null)
    setScreen(nextScreen)
  }

  function retry() {
    setError('')
    setNotice('')
    setReasons(EMPTY_REASONS)
    setSummarySource('')
    setScreen('input')
  }

  const canSave = SUMMARY_FIELDS.every(({ key }) => summary[key].trim())

  if (!isAuthReady) {
    return <main className="entry-shell"><p>로그인 상태를 확인하는 중이에요…</p></main>
  }

  if (!storageMode || (storageMode === 'cloud' && !session)) {
    return (
      <EntryScreen
        onStartGuest={startGuestMode}
        onAuthenticated={startCloudMode}
        supabaseClient={supabase}
        isSupabaseConfigured={isSupabaseConfigured}
      />
    )
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <img className="hero-img" src={hero} alt="" />
        <div>
          <div className="badge">오늘 하루 정리</div>
          <h1>하루 체크아웃</h1>
        </div>
      </header>

      <div className="storage-status">
        <span>
          <span aria-hidden="true">{storageMode === 'guest' ? '🔒' : '☁️'}</span>{' '}
          {storageMode === 'guest'
            ? '게스트 · 이 기기에 저장'
            : `${session.user.email} · Supabase 동기화`}
        </span>
        <button type="button" onClick={showStorageOptions}>
          {storageMode === 'guest' ? '저장 방식 변경' : '로그아웃'}
        </button>
      </div>

      <nav className="tab-nav" aria-label="화면 전환">
        <button
          className={`tab-btn${screen === 'input' || screen === 'result' ? ' active' : ''}`}
          type="button"
          onClick={() => switchTab('input')}
        >오늘</button>
        <button
          className={`tab-btn${screen === 'calendar' || screen === 'detail' ? ' active' : ''}`}
          type="button"
          onClick={() => switchTab('calendar')}
        >기록</button>
        <button
          className={`tab-btn${screen === 'report' ? ' active' : ''}`}
          type="button"
          onClick={() => switchTab('report')}
        >리포트</button>
      </nav>

      <section className="workspace" aria-live="polite">
        {storageMode === 'cloud' && guestRecordsForSync.length > 0 && (
          <div className="sync-banner">
            <div>
              <strong>이 기기에 게스트 기록 {guestRecordsForSync.length}개가 있어요.</strong>
              <span>자동 업로드하지 않아요. 원할 때 텍스트 기록만 복사할 수 있어요.</span>
            </div>
            <button type="button" onClick={handleSyncGuestRecords} disabled={isSyncing}>
              {isSyncing ? '복사 중…' : '클라우드에 복사'}
            </button>
          </div>
        )}

        {screen === 'input' && (
          <CheckinForm
            rawText={rawText}
            onTextChange={setRawText}
            mood={mood}
            onMoodChange={setMood}
            photoFile={photoFile}
            onPhotoChange={handlePhotoChange}
            onSubmit={handleOrganize}
            onSaveWithoutAi={handleSaveWithoutAi}
            isOrganizing={isOrganizing}
            isSaving={isSaving}
            aiConsent={aiConsent}
            onAiConsentChange={setAiConsent}
            storageMode={storageMode}
          />
        )}

        {screen === 'result' && (
          <section className="result-panel">
            <div className="result-meta">
              <p className="eyebrow">정리 결과</p>
              <span className={`source-badge source-${summarySource}`}>
                {summarySource === 'ai' ? 'AI로 정리됨' : '기본 문구로 정리됨'}
              </span>
            </div>
            <div className="origin-box">
              <span className="label">오늘 남긴 말</span>
              <span>{rawText}</span>
            </div>
            <div className="result-cards">
              {SUMMARY_FIELDS.map(({ key, icon, title }) => (
                <FlipCard
                  key={key}
                  icon={icon}
                  title={title}
                  value={summary[key]}
                  onChange={(value) => updateSummary(key, value)}
                  reason={reasons[key]}
                />
              ))}
            </div>
            <p className="hint">내용을 직접 고친 뒤 저장할 수 있어요.</p>
            <div className="result-actions">
              <button className="button button-secondary" type="button" onClick={retry}>다시 정리하기</button>
              <button className="button button-primary" type="button" onClick={handleSave} disabled={!canSave || isSaving}>
                {isSaving ? '저장하는 중…' : '저장'}
              </button>
            </div>
          </section>
        )}

        {screen === 'calendar' && (
          <section className="calendar-screen">
            <CalendarView checkins={checkins} onSelectCheckin={openDetail} />
            <div className="records-head">
              <span className="section-label">최근 기록</span>
              <div className="record-tools">
                {storageMode === 'guest' && checkins.length > 0 && (
                  <button className="clear-button" type="button" onClick={handleClearCheckins}>전체 삭제</button>
                )}
                <button className="refresh-button" type="button" onClick={loadCheckins} disabled={isLoadingRecords}>새로고침</button>
              </div>
            </div>
            {isLoadingRecords ? (
              <p className="empty-state">기록을 불러오는 중이에요…</p>
            ) : checkins.length === 0 ? (
              <div className="empty-state">
                <img src={hero} alt="" />
                <p>아직 저장된 기록이 없어요. 첫 체크아웃을 남겨보세요.</p>
              </div>
            ) : (
              <div className="record-list">
                {checkins.map((checkin) => (
                  <RecordCard key={checkin.id} checkin={checkin} onSelect={openDetail} />
                ))}
              </div>
            )}
          </section>
        )}

        {screen === 'detail' && selectedCheckin && (
          <RecordDetail checkin={selectedCheckin} onBack={backToList} onDelete={handleDeleteCheckin} />
        )}

        {screen === 'report' && (
          <ReportView
            checkins={checkins}
            isLoading={isLoadingRecords}
            onRefresh={loadCheckins}
            onAnalyze={analyzeReport}
          />
        )}

        {error && <p className="feedback feedback-error" role="alert">{error}</p>}
        {notice && <p className="feedback feedback-success">{notice}</p>}
      </section>
    </main>
  )
}

export default App
