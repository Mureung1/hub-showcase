import { useState } from 'react'

import forms from '../../components/ui/forms.module.css'
import { Modal } from '../../components/ui/Modal.jsx'
import { useTeamFlow } from '../../state/useTeamFlow.js'
import styles from './MembersPage.module.css'

export function MemberRemovalModal({ member, taskCount, isCurrentUser, onClose }) {
  const { actions } = useTeamFlow()
  const linkedUser = member.kind === 'user' || Boolean(member.authUserId)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function remove() {
    if (taskCount > 0 || submitting) return
    setSubmitting(true)
    setError('')
    try {
      await actions.deleteMember(member.id)
      onClose()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '팀원을 제거하지 못했습니다.')
      setSubmitting(false)
    }
  }

  const actionLabel = linkedUser ? (isCurrentUser ? '프로젝트 나가기' : '협업자 내보내기') : '담당자 삭제'
  return (
    <Modal
      title={actionLabel}
      onClose={onClose}
      footer={(
        <>
          <button type="button" className={`${forms.footerButton} ${forms.cancelButton}`} onClick={onClose} disabled={submitting}>취소</button>
          <button type="button" className={`${forms.footerButton} ${styles.dangerButton}`} onClick={remove} disabled={submitting || taskCount > 0}>{submitting ? '처리 중...' : actionLabel}</button>
        </>
      )}
    >
      <div className={styles.removalCopy}>
        <strong>{member.name}</strong>
        {taskCount > 0 ? <p role="alert">담당 중인 할 일 {taskCount}개를 다른 담당자에게 재배정한 뒤 다시 시도해 주세요.</p> : linkedUser ? <p>{isCurrentUser ? '나가면 이 프로젝트에 더 이상 접근할 수 없습니다.' : '내보내면 이 사용자는 프로젝트에 더 이상 접근할 수 없습니다.'}</p> : <p>삭제한 담당자는 복구할 수 없습니다.</p>}
        {error ? <p className={forms.error} role="alert">{error}</p> : null}
      </div>
    </Modal>
  )
}
