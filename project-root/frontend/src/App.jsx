// App.jsx
import { useState } from "react";
import "./App.css";
import LoginScreen from "./screens/LoginScreen";
import HomeScreen from "./screens/HomeScreen";
import PreferenceScreen from "./screens/PreferenceScreen";
import RecommendResultScreen from "./screens/RecommendResultScreen";
import CalendarScreen from "./screens/CalendarScreen";
import BottomNav from "./components/BottomNav";

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("home");
  const [preferences, setPreferences] = useState(null);
  const [confirmedSchedule, setConfirmedSchedule] = useState(null);

  function handleLogin(loggedInUser) {
    setUser(loggedInUser);
    setView("home");
  }

  // 단순 화면 전환 (뒤로가기, 하단 네비 탭 이동 등 데이터가 필요 없는 이동)
  function handleNavigate(nextView) {
    setView(nextView);
  }

  // 조건 입력 폼 제출 → 조건 저장 + 추천 결과 화면으로 이동
  function handlePreferenceSubmit(prefs) {
    setPreferences(prefs);
    setView("result");
  }

  // 추천 결과 중 하나 선택 → 확정 시간표 저장 + 캘린더 화면으로 이동
  function handleSelectResult(selection) {
    setConfirmedSchedule(selection);
    setView("calendar");
  }

  // BottomNav에는 'result'라는 탭이 없으므로, 추천 결과 화면에 있을 땐 '추천' 탭을 활성으로 표시
  const activeTab = view === "result" ? "preference" : view;

  function renderScreen() {
    switch (view) {
      case "home":
        return <HomeScreen userName={user?.email} onNavigate={handleNavigate} />;
      case "preference":
        return <PreferenceScreen onNavigate={handleNavigate} onSubmit={handlePreferenceSubmit} />;
      case "result":
        return (
          <RecommendResultScreen
            preferences={preferences}
            onNavigate={handleNavigate}
            onSelect={handleSelectResult}
          />
        );
      case "calendar":
        return <CalendarScreen confirmedSchedule={confirmedSchedule} onNavigate={handleNavigate} />;
      default:
        return <HomeScreen userName={user?.email} onNavigate={handleNavigate} />;
    }
  }

  if (!user) {
    return (
      <div className="phone">
        <LoginScreen onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="phone">
      <div className="phone__screen">{renderScreen()}</div>
      <BottomNav activeKey={activeTab} onChange={setView} />
    </div>
  );
}
