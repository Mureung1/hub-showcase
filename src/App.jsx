import { useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import ChatDemo from "./features/chat-demo/ChatDemo.jsx";
import LogViewer from "./features/log-viewer/LogViewer.jsx";
import "./App.css";

const SCREENS = {
  "chat-demo": ChatDemo,
  "log-viewer": LogViewer,
};

export default function App() {
  const [screen, setScreen] = useState("chat-demo");
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
