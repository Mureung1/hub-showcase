import { createBrowserRouter } from 'react-router'
import { ProfileSetup } from '../features/profile'
import IntroPage from '../pages/IntroPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <IntroPage />,
  },
  {
    path: '/profile',
    element: <ProfileSetup />,
  },
])