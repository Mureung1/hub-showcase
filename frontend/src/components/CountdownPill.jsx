import { useAppState } from '../state/useAppState'
import { fmt } from '../lib/format'
import styles from './CountdownPill.module.css'

export default function CountdownPill() {
  const { state } = useAppState()
  return (
    <div className={styles.pill}>
      <span className="msym">schedule</span>
      <span className={styles.label}>{fmt(state.waitSecs)}</span>
    </div>
  )
}
