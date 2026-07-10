import { useAppState } from '../state/useAppState'
import styles from './Toast.module.css'

export default function Toast() {
  const { state } = useAppState()
  if (!state.toast) return null

  return (
    <div className={styles.toast}>
      <span className={`msymf ${styles.icon}`}>check_circle</span>
      {state.toast}
    </div>
  )
}
