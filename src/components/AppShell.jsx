import BottomTabBar from './BottomTabBar.jsx'
import { colors, layout } from '../styles/theme.js'

const TAB_BAR_CLEARANCE = 76 // 탭바(고정 위치)에 콘텐츠 마지막 줄이 가리지 않도록 확보하는 하단 여백

export default function AppShell({ children, hideTabBar = false }) {
  return (
    <div style={{ background: colors.bg, minHeight: '100svh' }}>
      <div
        style={{
          maxWidth: layout.shellMaxWidth,
          margin: '0 auto',
          paddingBottom: hideTabBar ? 0 : TAB_BAR_CLEARANCE,
        }}
      >
        {children}
      </div>
      {!hideTabBar && <BottomTabBar />}
    </div>
  )
}
