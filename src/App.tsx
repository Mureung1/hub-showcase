import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './components/MainLayout'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import ChemistryPage from './pages/chemistry/ChemistryPage'
import OrganicMechanismPage from './pages/chemistry/OrganicMechanismPage'
import SortingPage from './pages/cs/SortingPage'
import LinearStructuresPage from './pages/cs/LinearStructuresPage'
import TreePage from './pages/cs/TreePage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="chemistry/viewer" element={<ChemistryPage />} />
          <Route path="chemistry/organic" element={<OrganicMechanismPage />} />
          <Route path="cs/sorting" element={<SortingPage />} />
          <Route path="cs/stack" element={<LinearStructuresPage type="stack" />} />
          <Route path="cs/queue" element={<LinearStructuresPage type="queue" />} />
          <Route path="cs/deque" element={<LinearStructuresPage type="deque" />} />
          <Route path="cs/tree" element={<TreePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
