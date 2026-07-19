import { Route, Routes } from "react-router";
import LoginPage from "./pages/LoginPage";
import RecipeListPlaceholderPage from "./pages/RecipeListPlaceholderPage";
import TransferInvitationPlaceholderPage from "./pages/TransferInvitationPlaceholderPage";
import ProtectedRoute from "./components/ProtectedRoute";


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