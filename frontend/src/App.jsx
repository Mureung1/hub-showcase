import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './layouts/Layout';
import ProjectInfo from './pages/ProjectInfo';
import LoginPage from './pages/LoginPage';
import OAuthCallback from './pages/OAuthCallback';
import NotFound from './pages/NotFound';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/about" replace />} />
        <Route path="/about" element={<ProjectInfo />} />
      </Route>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/oauth/callback" element={<OAuthCallback />} />
      <Route path="*" element={<NotFound />} />
    </Routes>

  );
}

export default App;