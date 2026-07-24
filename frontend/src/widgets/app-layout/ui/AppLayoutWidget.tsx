import { Outlet } from 'react-router-dom'

import { SidebarWidget } from '@/widgets/sidebar'

import { LayoutRoot, MainContent } from './AppLayoutWidget.styles'

export const AppLayoutWidget = () => (
  <LayoutRoot>
    <SidebarWidget />
    <MainContent aria-label="GAZUA app shell">
      <Outlet />
    </MainContent>
  </LayoutRoot>
)
