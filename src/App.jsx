import { Routes, Route, Navigate } from 'react-router'
import Home from './screens/Home.jsx'
import Login from './screens/Login.jsx'
import Signup from './screens/Signup.jsx'
import Join from './screens/flow/Join.jsx'
import CreateWizard from './screens/wizard/CreateWizard.jsx'
import PlanReview from './screens/flow/PlanReview.jsx'
import InviteLink from './screens/flow/InviteLink.jsx'
import Survey from './screens/flow/Survey.jsx'
import AssignmentResult from './screens/flow/AssignmentResult.jsx'
import AppLayout from './components/AppLayout.jsx'
import DashboardTab from './screens/app/DashboardTab.jsx'
import ProgressTab from './screens/app/ProgressTab.jsx'
import ProjectsTab from './screens/app/ProjectsTab.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/join/:token" element={<Join />} />
      <Route path="/projects/new" element={<CreateWizard />} />
      <Route path="/projects/:id/plan" element={<PlanReview />} />
      <Route path="/projects/:id/invite" element={<InviteLink />} />
      <Route path="/projects/:id/survey" element={<Survey />} />
      <Route path="/projects/:id/result" element={<AssignmentResult />} />
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardTab />} />
        <Route path="progress" element={<ProgressTab />} />
        <Route path="projects" element={<ProjectsTab />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
