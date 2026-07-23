import { useMemo } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'

import { AuthCallbackPage } from './auth/AuthCallbackPage.jsx'
import { ProtectedRoute } from './auth/ProtectedRoute.jsx'
import { useAuth } from './auth/useAuth.js'
import { AppShell } from './components/layout/AppShell.jsx'
import { ProjectShell } from './components/layout/ProjectShell.jsx'
import { createApiTeamFlowRepository, createDemoTeamFlowRepository } from './data/apiTeamFlowRepository.js'
import { AiPage } from './features/ai/AiPage.jsx'
import { ProjectDashboardPage } from './features/dashboard/ProjectDashboardPage.jsx'
import { LandingPage } from './features/landing/LandingPage.jsx'
import { MembersPage } from './features/members/MembersPage.jsx'
import { NotesPage } from './features/notes/NotesPage.jsx'
import { ProjectListPage } from './features/projects/ProjectListPage.jsx'
import { ResourcesPage } from './features/resources/ResourcesPage.jsx'
import { MyTasksPage } from './features/tasks/MyTasksPage.jsx'
import { ProjectTasksPage } from './features/tasks/ProjectTasksPage.jsx'
import { TeamFlowProvider } from './state/TeamFlowProvider.jsx'

const TEAMFLOW_API_BASE_URL = import.meta.env.VITE_TEAMFLOW_API_URL ?? ''

/**
 * Defines the public route surface for the TeamFlow web application.
 */
export default function App({ authenticatedRepository, guestRepository }) {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<TeamFlowBoundary authenticatedRepository={authenticatedRepository} guestRepository={guestRepository} />}>
          <Route element={<AppShell />}>
            <Route path="projects" element={<ProjectListPage />} />
            <Route path="tasks" element={<MyTasksPage />} />
            <Route path="members" element={<MembersPage />} />
          </Route>
          <Route path="projects/:projectId" element={<ProjectShell />}>
            <Route index element={<ProjectDashboardPage />} />
            <Route path="tasks" element={<ProjectTasksPage />} />
            <Route path="notes" element={<NotesPage />} />
            <Route path="resources" element={<ResourcesPage />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="ai" element={<AiPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<FallbackRedirect />} />
    </Routes>
  )
}

function TeamFlowBoundary({ authenticatedRepository, guestRepository }) {
  const auth = useAuth()
  const repository = useMemo(() => {
    if (auth.status === 'guest') {
      return guestRepository ?? createDemoTeamFlowRepository({
        apiBaseUrl: TEAMFLOW_API_BASE_URL,
      })
    }
    return authenticatedRepository ?? createApiTeamFlowRepository({
      getAccessToken: auth.getAccessToken,
      apiBaseUrl: TEAMFLOW_API_BASE_URL,
    })
  }, [auth.status, auth.getAccessToken, authenticatedRepository, guestRepository])

  return <TeamFlowProvider key={`${auth.status}:${auth.user?.id ?? 'guest'}`} repository={repository}><Outlet /></TeamFlowProvider>
}

function FallbackRedirect() {
  const auth = useAuth()
  const destination = auth.status === 'authenticated' || auth.status === 'guest' ? '/projects' : '/'
  return <Navigate replace to={destination} />
}
