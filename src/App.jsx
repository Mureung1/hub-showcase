import { useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import ChatDemo from "./features/chat-demo/ChatDemo.jsx";
import LogViewer from "./features/log-viewer/LogViewer.jsx";
import AuthPage from "./features/auth/AuthPage.jsx";
import { useAuth } from "./features/auth/AuthContext.jsx";
import "./App.css";

const SCREENS = {
  "chat-demo": ChatDemo,
  "log-viewer": LogViewer,
};

export default function App() {
  const { user, loading } = useAuth();
  const [screen, setScreen] = useState("chat-demo");

  if (loading) {
    return <div className="app-loading">불러오는 중...</div>;
  }

  if (!user) {
    return <AuthPage />;
  }

  const ActiveScreen = SCREENS[screen];

  return (
    <div className="app-shell">
      <Sidebar active={screen} onNavigate={setScreen} />
      <main className="app-content">
        <ActiveScreen />
      </main>
    </div>
  );
}
