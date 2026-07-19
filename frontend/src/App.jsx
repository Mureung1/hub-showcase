import { Route, Routes } from "react-router";
import LoginPage from "./pages/LoginPage";
import RecipeListPlaceholderPage from "./pages/RecipeListPlaceholderPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/recipes" element={<RecipeListPlaceholderPage />} />
    </Routes>
  )
}

export default App;