import { Routes, Route } from 'react-router-dom'
import ProjectInfo from './ProjectInfo';
import LoginPage from './pages/LoginPage';
import OAuthCallback from './pages/OAuthCallback';
import NotFound from './pages/NotFound';

function App() {
  return (
    <Routes>
      <Route path="/" element={<ProjectInfo />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/oauth/callback" element={<OAuthCallback />} />
      <Route path="*" element={<NotFound />} />
    </Routes>

  );
}

export default App;