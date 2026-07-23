import { Route, Routes } from 'react-router-dom'

import { HomePage } from '@/pages/home'
import { ROUTES } from '@/shared/config/routes'
import { AppLayoutWidget } from '@/widgets/app-layout'

export const AppRoutes = () => (
  <Routes>
    <Route path={ROUTES.HOME} element={<AppLayoutWidget />}>
      <Route index element={<HomePage />} />
    </Route>
  </Routes>
)
