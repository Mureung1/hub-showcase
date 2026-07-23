import { Route, Routes } from "react-router";
import LoginPage from "./pages/LoginPage";
import RecipeListPlaceholderPage from "./pages/RecipeListPlaceholderPage";
import TransferInvitationPlaceholderPage from "./pages/TransferInvitationPlaceholderPage";
import ProtectedRoute from "./components/ProtectedRoute";
import RecipeDraftPage from "./pages/RecipeDraftPage";
import RecipeDraftRoute from "./components/RecipeDraftRoute";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route
        path="/recipes"
        element={
          <ProtectedRoute>
            <RecipeListPlaceholderPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/recipes/new"
        element={
          <ProtectedRoute>
            <RecipeListPlaceholderPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/recipes/draft"
        element={
          <ProtectedRoute>
            <RecipeDraftRoute>
              <RecipeDraftPage />
            </RecipeDraftRoute>
          </ProtectedRoute>
        } />
      <Route
        path="/transfer-invitations/:linkToken"
        element={
          <ProtectedRoute>
            <TransferInvitationPlaceholderPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App;