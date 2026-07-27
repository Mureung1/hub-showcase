import { useEffect, useState } from 'react'
import { getPreferences, updatePreferences } from '../api/auth'
import Sidebar from '../components/Sidebar'
import PersonalType, { type TastePreferences } from './PersonalType'
import './SettingsPage.css'

const DEFAULT_PREFERENCES: TastePreferences = {
  spicy: 5,
  valueForMoney: 5,
  atmosphere: 5,
  waiting: 5,
  quietness: 5,
}

export default function SettingsPage() {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isCancelled = false
    void getPreferences()
      .then((data) => {
        if (!isCancelled) setPreferences(data)
      })
      .catch((reason) => {
        if (!isCancelled) {
          setErrorMessage(
            reason instanceof Error ? reason.message : '취향 설정을 불러오지 못했습니다.',
          )
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false)
      })

    return () => {
      isCancelled = true
    }
  }, [])

  const handleSave = async (nextPreferences: TastePreferences) => {
    setIsSaving(true)
    setStatusMessage('')
    setErrorMessage('')
    try {
      const result = await updatePreferences(nextPreferences)
      setPreferences(result.preferences)
      setStatusMessage(result.message)
    } catch (reason) {
      setErrorMessage(
        reason instanceof Error ? reason.message : '취향 설정을 저장하지 못했습니다.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="settings-page">
      <Sidebar />
      {isLoading ? (
        <main className="settings-page__loading" aria-live="polite">
          취향 설정을 불러오는 중...
        </main>
      ) : (
        <PersonalType
          values={preferences}
          submitLabel="취향 설정 저장하기"
          submittingLabel="저장 중..."
          isSubmitting={isSaving}
          statusMessage={statusMessage}
          errorMessage={errorMessage}
          onChange={(next) => {
            setPreferences(next)
            setStatusMessage('')
          }}
          onSubmit={handleSave}
        />
      )}
    </div>
  )
}
