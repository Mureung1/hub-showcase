import ProjectInfo from './ProjectInfo';
import LoginPage from './LoginPage';
import OAuthCallback from './OAuthCallback';

function App() {
  const path = window.location.pathname;

  if (path === '/oauth/callback') return <OAuthCallback />;
  if (path === '/login') return <LoginPage />;

  return (
    <div>
      <ProjectInfo />
    </div>
  );
}

export default App;