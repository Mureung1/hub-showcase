import Check from 'lucide-react/dist/esm/icons/check.mjs'
import { useState } from 'react'

import { Modal } from '../../../components/ui/Modal.jsx'
import { useTeamFlow } from '../../../state/useTeamFlow.js'
import { ProjectIcon } from './ProjectIcon.jsx'
import { PROJECT_ICON_OPTIONS } from './projectIconOptions.js'
import styles from './ProjectIconPicker.module.css'

export function ProjectIconPicker({ project, onClose }) {
  const { actions } = useTeamFlow()
  const [selected, setSelected] = useState(project.iconKey ?? PROJECT_ICON_OPTIONS[0].key)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function choose(iconKey) {
    if (saving) return
    setSelected(iconKey)
    setSaving(true)
    setError('')
    try {
      await actions.updateProject(project.id, { iconKey })
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '프로젝트 아이콘을 변경하지 못했습니다.')
      setSaving(false)
    }
  }

  return (
    <Modal title="프로젝트 아이콘 변경" onClose={onClose} width={390}>
      <p className={styles.description}>프로젝트를 구분하기 쉬운 아이콘을 선택하세요.</p>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <div className={styles.grid} aria-label="프로젝트 아이콘" role="group" aria-busy={saving}>
        {PROJECT_ICON_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            className={`${styles.option} ${selected === option.key ? styles.selected : ''}`}
            aria-pressed={selected === option.key}
            disabled={saving}
            onClick={() => choose(option.key)}
          >
            <span className={styles.icon}><ProjectIcon iconKey={option.key} size={20} /></span>
            <span>{option.label}</span>
            {selected === option.key ? <Check className={styles.check} size={14} /> : null}
          </button>
        ))}
      </div>
    </Modal>
  )
}
