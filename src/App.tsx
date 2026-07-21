import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './components/MainLayout'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import ChemistryPage from './pages/chemistry/ChemistryPage'
import VseprPage from './pages/chemistry/VseprPage'
import LewisStructurePage from './pages/chemistry/LewisStructurePage'
import SubstitutionEliminationPage from './pages/chemistry/SubstitutionEliminationPage'
import AlkeneAdditionPage from './pages/chemistry/AlkeneAdditionPage'
import AcylSubstitutionPage from './pages/chemistry/AcylSubstitutionPage'
import CoordinationGeometryPage from './pages/chemistry/CoordinationGeometryPage'
import CrystalFieldPage from './pages/chemistry/CrystalFieldPage'
import PhysicalChemistryPage from './pages/chemistry/PhysicalChemistryPage'
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
          <Route path="chemistry/vsepr" element={<VseprPage />} />
          <Route path="chemistry/lewis-structure" element={<LewisStructurePage />} />
          <Route
            path="chemistry/organic/substitution-elimination"
            element={<SubstitutionEliminationPage />}
          />
          <Route path="chemistry/organic/alkene-addition" element={<AlkeneAdditionPage />} />
          <Route path="chemistry/organic/acyl-substitution" element={<AcylSubstitutionPage />} />
          <Route path="chemistry/inorganic/geometry" element={<CoordinationGeometryPage />} />
          <Route path="chemistry/inorganic/crystal-field" element={<CrystalFieldPage />} />
          <Route path="chemistry/physical" element={<PhysicalChemistryPage />} />
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
