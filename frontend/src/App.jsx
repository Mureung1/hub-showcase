import { Route, Routes } from "react-router";
import LoginPage from "./pages/LoginPage";
import RecipeListPlaceholderPage from "./pages/RecipeListPlaceholderPage";
import ProtectedRoute from "./components/ProtectedRoute";
import RecipeDraftPage from "./pages/RecipeDraftPage";
import RecipeDraftRoute from "./components/RecipeDraftRoute";
import TransferInvitationPage from "./pages/TransferInvitationPage";
import RecipeEditPage from "./pages/RecipeEditPage";

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
        path="/recipes/:recipeId"
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
        }
      />
      <Route
        path="/transfer-invitations"
        element={
          <ProtectedRoute>
            <RecipeListPlaceholderPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/recipes/:recipeId/edit"
        element={
          <ProtectedRoute>
            <RecipeEditPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transfer-invitations/:linkToken"
        element={
          <ProtectedRoute>
            <TransferInvitationPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App;
