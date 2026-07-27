import CheckCircle2 from 'lucide-react/dist/esm/icons/circle-check-big.mjs'
import KeyRound from 'lucide-react/dist/esm/icons/key-round.mjs'
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check.mjs'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2.mjs'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Modal } from '../../components/ui/Modal.jsx'
import forms from '../../components/ui/forms.module.css'
import { useTeamFlow } from '../../state/useTeamFlow.js'
import styles from './AiCredentialSettingsModal.module.css'

export function AiCredentialSettingsModal({ onClose }) {
  const { state, actions } = useTeamFlow()
  const { aiCredential, aiExecution } = state
  const { refreshAiCredential, saveAiCredential, deleteAiCredential } = actions
  const [apiKey, setApiKey] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const closeModal = useCallback(() => onCloseRef.current(), [])
  const connected = Boolean(aiCredential.configured && aiCredential.verifiedAt)

  useEffect(() => {
    let active = true
    refreshAiCredential()
      .catch((requestError) => {
        if (active) setError(errorMessage(requestError, 'Gemini API 키 상태를 확인하지 못했습니다.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [refreshAiCredential])

  async function save() {
    const normalizedKey = apiKey.trim()
    if (!normalizedKey || !acknowledged) return
    setSaving(true)
    setError('')
    setFeedback('')
    try {
      await saveAiCredential({
        apiKey: normalizedKey,
        acknowledgedFreeTierPolicy: true,
      })
      setApiKey('')
      setAcknowledged(false)
      setFeedback('Gemini API 키 연결을 확인했습니다.')
    } catch (requestError) {
      setError(errorMessage(requestError, 'Gemini API 키를 연결하지 못했습니다.'))
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    setDeleting(true)
    setError('')
    setFeedback('')
    try {
      await deleteAiCredential()
      setApiKey('')
      setAcknowledged(false)
      setFeedback('저장된 Gemini API 키를 삭제했습니다.')
    } catch (requestError) {
      setError(errorMessage(requestError, 'Gemini API 키를 삭제하지 못했습니다.'))
    } finally {
      setDeleting(false)
    }
  }

  const busy = loading || saving || deleting

  return (
    <Modal
      title="Gemini API 설정"
      width={520}
      onClose={closeModal}
      footer={(
        <>
          <button type="button" className={`${forms.footerButton} ${forms.cancelButton}`} onClick={closeModal}>취소</button>
          <button
            type="button"
            className={`${forms.footerButton} ${forms.submitButton}`}
            disabled={busy || !apiKey.trim() || !acknowledged}
            onClick={() => void save()}
          >
            {saving ? '연결 확인 중...' : '저장 및 연결 확인'}
          </button>
        </>
      )}
    >
      <div className={styles.content}>
        <section className={styles.providerSummary} aria-label="AI 제공자">
          <span className={styles.providerIcon}><KeyRound size={18} aria-hidden="true" /></span>
          <div>
            <strong>Google Gemini</strong>
            <span>{aiExecution.mode === 'live' ? aiExecution.modelLabel || 'Gemini' : '개인 API 키 연결'}</span>
          </div>
        </section>

        <section className={`${styles.connectionStatus} ${connected ? styles.connectionStatusConnected : ''}`} aria-live="polite">
          {connected ? <CheckCircle2 size={17} aria-hidden="true" /> : <ShieldCheck size={17} aria-hidden="true" />}
          <div>
            <strong>{loading ? '연결 상태 확인 중...' : connected ? '연결됨' : '연결된 API 키가 없습니다.'}</strong>
            {connected ? (
              <span>
                끝 4자리 <b className={styles.keyHint}>{aiCredential.keyHint}</b>
                {aiCredential.verifiedAt ? ` · ${formatVerifiedAt(aiCredential.verifiedAt)} 확인` : ''}
              </span>
            ) : <span>AI 작업을 실행하려면 본인의 Gemini API 키를 연결하세요.</span>}
          </div>
          {connected ? (
            <button type="button" className={styles.deleteButton} disabled={busy} onClick={() => void remove()}>
              <Trash2 size={14} aria-hidden="true" />{deleting ? '삭제 중...' : '저장된 키 삭제'}
            </button>
          ) : null}
        </section>

        <label className={forms.field}>
          <span className={forms.label}>{connected ? '새 API 키로 교체' : 'Gemini API 키'} <em>*</em></span>
          <input
            className={forms.input}
            type="password"
            name="teamflow-gemini-api-key"
            value={apiKey}
            disabled={busy}
            autoComplete="off"
            spellCheck="false"
            placeholder="Google AI Studio에서 발급한 키를 입력하세요"
            aria-label="Gemini API 키"
            onChange={(event) => setApiKey(event.target.value)}
          />
          <span className={forms.optional}>키 원문은 다시 표시되지 않으며 TeamFlow 서버에서 암호화해 저장합니다.</span>
        </label>

        <label className={styles.consent}>
          <input
            type="checkbox"
            checked={acknowledged}
            disabled={busy}
            onChange={(event) => setAcknowledged(event.target.checked)}
          />
          <span>
            <strong>무료 티어 데이터 처리 안내에 동의합니다.</strong>
            <small>무료 티어 입력·출력은 Google 제품 개선에 사용될 수 있습니다. 민감정보나 비밀정보를 전송하지 마세요.</small>
          </span>
        </label>

        <a className={styles.policyLink} href="https://ai.google.dev/gemini-api/docs/pricing" target="_blank" rel="noreferrer">
          Gemini API 가격 및 데이터 처리 정책 보기
        </a>

        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        {feedback ? <p className={styles.feedback} role="status">{feedback}</p> : null}
      </div>
    </Modal>
  )
}

function formatVerifiedAt(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '최근'
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function errorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback
}
