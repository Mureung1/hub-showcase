import { createBrowserRouter } from 'react-router'
import { AppShell } from './AppShell'
import { GitLabPage } from '../features/git-lab'
import { LearningWorkspace } from '../features/learning-workspace'
import { AddMistakeNotePage, MistakeNotesPage } from '../features/mistake-notes'
import { ProfileSetup } from '../features/profile'
import { TodayLearningHub } from '../features/today-learning'
import IntroPage from '../pages/IntroPage'

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      {
        path: '/',
        element: <IntroPage />,
      },
      {
        path: '/profile',
        element: <ProfileSetup />,
      },
      {
        path: '/today',
        element: <TodayLearningHub />,
      },
      {
        path: '/workspace',
        element: <LearningWorkspace />,
      },
      {
        path: '/git-lab',
        element: <GitLabPage />,
      },
      {
        path: '/mistake-notes',
        element: <MistakeNotesPage />,
      },
      {
        path: '/mistake-notes/new',
        element: <AddMistakeNotePage />,
      },
    ],
  },
])
