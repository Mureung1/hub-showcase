// App.jsx
import { useEffect, useState } from "react";
import "./App.css";
import { supabase } from "./api/supabaseClient";
import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";
import HomeScreen from "./screens/HomeScreen";
import PreferenceScreen from "./screens/PreferenceScreen";
import RecommendResultScreen from "./screens/RecommendResultScreen";
import CalendarScreen from "./screens/CalendarScreen";
import BottomNav from "./components/BottomNav";

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authView, setAuthView] = useState("login"); // 로그인 전 화면: "login" | "signup"
  const [view, setView] = useState("home");
  const [preferences, setPreferences] = useState(null);

  // 새로고침해도 로그인 상태가 유지되도록 기존 세션을 복원하고, 이후 로그인/로그아웃 변화를 계속 반영한다.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthChecked(true);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  function handleAuthenticated() {
    setView("home");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setView("home");
    setAuthView("login");
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

  // 추천 결과 중 하나 선택 → RecommendResultScreen이 이미 백엔드에 저장을 마친 뒤 호출됨. 화면만 전환.
  function handleSelectResult() {
    setView("calendar");
  }

  // BottomNav에는 'result'라는 탭이 없으므로, 추천 결과 화면에 있을 땐 '추천' 탭을 활성으로 표시
  const activeTab = view === "result" ? "preference" : view;

  function renderScreen() {
    switch (view) {
      case "home":
        return <HomeScreen userName={user?.email} onNavigate={handleNavigate} onLogout={handleLogout} />;
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
        return <CalendarScreen onNavigate={handleNavigate} />;
      default:
        return <HomeScreen userName={user?.email} onNavigate={handleNavigate} onLogout={handleLogout} />;
    }
  }

  if (!authChecked) {
    return <div className="phone" />;
  }

  if (!user) {
    return (
      <div className="phone">
        {authView === "login" ? (
          <LoginScreen onLogin={handleAuthenticated} onNavigateToSignup={() => setAuthView("signup")} />
        ) : (
          <SignupScreen onSignedUp={handleAuthenticated} onNavigateToLogin={() => setAuthView("login")} />
        )}
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
