import { useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import ChatDemo from "./features/chat-demo/ChatDemo.jsx";
import LogViewer from "./features/log-viewer/LogViewer.jsx";
import AuthPage from "./features/auth/AuthPage.jsx";
import { useAuth } from "./features/auth/AuthContext.jsx";
import "./App.css";

export default function App() {
  const { user, loading } = useAuth();
  const [screen, setScreen] = useState("chat-demo");

  if (loading) {
    return <div className="app-loading">불러오는 중...</div>;
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="app-shell">
      <Sidebar active={screen} onNavigate={setScreen} />
      <main className="app-content">
        {/* ChatDemo는 항상 마운트해 대화·입력 상태를 유지하고, 비활성일 때 숨기기만 한다.
            LogViewer는 매번 마운트돼 진입할 때마다 최신 로그를 다시 불러온다. */}
        <div className={`screen-pane${screen === "chat-demo" ? "" : " screen-pane--hidden"}`}>
          <ChatDemo />
        </div>
        {screen === "log-viewer" && <LogViewer />}
      </main>
    </div>
  );
}
