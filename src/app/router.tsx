import { createBrowserRouter } from 'react-router'
import { GitLabPage } from '../features/git-lab'
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
  {
    path: '/git-lab',
    element: <GitLabPage />,
  },
])