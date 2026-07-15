import { Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from './components/layout/AppShell.jsx'
import { ProjectShell } from './components/layout/ProjectShell.jsx'
import { ProjectDashboardPage } from './features/dashboard/ProjectDashboardPage.jsx'
import { MembersPage } from './features/members/MembersPage.jsx'
import { NotesPage } from './features/notes/NotesPage.jsx'
import { ProjectListPage } from './features/projects/ProjectListPage.jsx'
import { ResourcesPage } from './features/resources/ResourcesPage.jsx'
import { MyTasksPage } from './features/tasks/MyTasksPage.jsx'
import { ProjectTasksPage } from './features/tasks/ProjectTasksPage.jsx'

/**
 * Defines the public route surface for the TeamFlow web application.
 */
export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate replace to="/projects" />} />
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
      </Route>
      <Route path="*" element={<Navigate replace to="/projects" />} />
    </Routes>
  )
}
