import CheckCircle2 from 'lucide-react/dist/esm/icons/circle-check-big.mjs'
import KeyRound from 'lucide-react/dist/esm/icons/key-round.mjs'
import Sparkles from 'lucide-react/dist/esm/icons/sparkles.mjs'

import styles from './AiExecutionStatus.module.css'

export function AiExecutionStatus({
  execution,
  credential,
  readOnly,
  onOpenSettings,
}) {
  const live = execution?.mode === 'live'
  const connected = Boolean(
    credential?.configured
    && credential?.verifiedAt
  )

  if (!live) {
    return (
      <div className={styles.status}>
        <Sparkles size={16} aria-hidden="true" />
        <p>
          <strong>Mock 모드</strong>
          <span>{readOnly
            ? '게스트 데모는 저장된 예시 결과를 읽기 전용으로 보여 줍니다.'
            : '외부 AI API를 호출하지 않고 TeamFlow 서버가 고정된 규칙으로 결과를 만듭니다.'}</span>
        </p>
      </div>
    )
  }

  if (connected) {
    return (
      <div className={`${styles.status} ${styles.connected}`}>
        <CheckCircle2 size={16} aria-hidden="true" />
        <p>
          <strong>Gemini 연결됨</strong>
          <span>{execution.modelLabel || 'Gemini'} · 실행할 때 현재 로그인 사용자의 API 키를 사용합니다.</span>
        </p>
      </div>
    )
  }

  return (
    <div className={`${styles.status} ${styles.required}`}>
      <KeyRound size={16} aria-hidden="true" />
      <p>
        <strong>Gemini API 키 설정 필요</strong>
        <span>실제 AI 작업을 실행하려면 본인의 Gemini API 키를 먼저 연결하세요.</span>
      </p>
      {!readOnly ? <button type="button" onClick={onOpenSettings}>API 키 설정</button> : null}
    </div>
  )
}
