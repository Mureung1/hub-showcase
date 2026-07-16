import Sparkles from 'lucide-react/dist/esm/icons/sparkles.mjs'

import styles from './ui.module.css'

export function Avatar({ member, size = 'small' }) {
  if (!member) return null
  return (
    <span className={`${styles.avatarWrap} ${styles[`avatarWrap_${size}`]}`} title={member.name}>
      <span className={styles.avatar} style={{ '--avatar-color': member.color }} aria-hidden="true">
        {member.initial}
      </span>
      {member.isAi ? <span className={styles.aiSpark} aria-label="AI 팀원"><Sparkles size={7} /></span> : null}
    </span>
  )
}
