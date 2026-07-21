import { Routes, Route } from 'react-router-dom'
import Layout from './layouts/Layout';
import Home from './pages/Home';
import ProjectInfo from './pages/ProjectInfo';
import OAuthCallback from './pages/OAuthCallback';
import SubscriptionForm from './pages/SubscriptionForm';
import NotFound from './pages/NotFound';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<ProjectInfo />} />
        <Route path="/subscriptions/new" element={<SubscriptionForm />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="/oauth/callback" element={<OAuthCallback />} />
    </Routes>

  );
}

export default App;