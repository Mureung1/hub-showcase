import { Routes, Route } from 'react-router-dom'
import Layout from './layouts/Layout';
import Home from './pages/Home';
import ProjectInfo from './pages/ProjectInfo';
import OAuthCallback from './pages/OAuthCallback';
import SubscriptionForm from './pages/SubscriptionForm';
import SubscriptionDetail from './pages/SubscriptionDetail';
import SubscriptionEdit from './pages/SubscriptionEdit';
import SubscriptionJoin from './pages/SubscriptionJoin';
import NotFound from './pages/NotFound';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<ProjectInfo />} />
        <Route path="/subscriptions/new" element={<SubscriptionForm />} />
        <Route path="/subscriptions/:id" element={<SubscriptionDetail />} />
        <Route path="/subscriptions/:id/edit" element={<SubscriptionEdit />} />
        <Route path="/join/:id" element={<SubscriptionJoin />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="/oauth/callback" element={<OAuthCallback />} />
    </Routes>

  );
}

export default App;