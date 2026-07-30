import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../Sidebar'
import CountdownPill from '../CountdownPill'
import Toast from '../Toast'
import ConfirmModal from '../modals/ConfirmModal'
import ArrivedModal from '../modals/ArrivedModal'
import FeedbackModal from '../modals/FeedbackModal'
import { useAppState } from '../../state/useAppState'
import styles from './AppLayout.module.css'

export default function AppLayout() {
  const { state } = useAppState()
  const { pathname } = useLocation()
  const showSidebar = pathname !== '/' && pathname !== '/reset-password'
  const showCountdown = pathname === '/main' || pathname === '/sent'

  return (
    <div className={styles.app}>
      {showSidebar && <Sidebar />}
      <main className={showSidebar ? styles.contentWithSidebar : styles.content}>
        <Outlet />
      </main>

      {showCountdown && <CountdownPill />}
      {state.showConfirm && <ConfirmModal />}
      {state.showArrived && <ArrivedModal />}
      {state.showFeedback && <FeedbackModal />}
      <Toast />
    </div>
  )
}
