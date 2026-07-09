import { Routes, Route } from 'react-router-dom'
import FridgePage from './pages/FridgePage'
import Home from './pages/Home'
import TypePage from './pages/TypePage'
import CategoryPage from './pages/CategoryPage'
import RecipeDetailPage from './pages/RecipeDetailPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<FridgePage />} />
      <Route path="/home" element={<Home />} />
      <Route path="/type/:type" element={<TypePage />} />
      <Route path="/category/:categoryId" element={<CategoryPage />} />
      <Route path="/recipe/:recipeId" element={<RecipeDetailPage />} />
    </Routes>
  )
}

export default App
