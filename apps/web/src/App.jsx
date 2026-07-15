import { Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from './components/layout/AppShell.jsx'
import { MembersPage } from './features/members/MembersPage.jsx'
import { ProjectListPage } from './features/projects/ProjectListPage.jsx'
import { MyTasksPage } from './features/tasks/MyTasksPage.jsx'

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
      <Route path="*" element={<Navigate replace to="/projects" />} />
    </Routes>
  )
}
