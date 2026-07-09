import { createBrowserRouter } from 'react-router'
import IntroPage from '../pages/IntroPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <IntroPage />,
  },
])
