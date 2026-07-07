import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './components/MainLayout'
import HomePage from './pages/HomePage'
import ChemistryPage from './pages/chemistry/ChemistryPage'
import OrganicMechanismPage from './pages/chemistry/OrganicMechanismPage'
import SortingPage from './pages/cs/SortingPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="chemistry/viewer" element={<ChemistryPage />} />
          <Route path="chemistry/organic" element={<OrganicMechanismPage />} />
          <Route path="cs/sorting" element={<SortingPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
