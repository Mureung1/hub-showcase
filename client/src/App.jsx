import { Routes, Route } from 'react-router-dom';
import MapScreen from './screens/MapScreen.jsx';
import ListScreen from './screens/ListScreen.jsx';
import RouteScreen from './screens/RouteScreen.jsx';
import MyPageScreen from './screens/MyPageScreen.jsx';
import AuthModal from './screens/AuthModal.jsx';
import RecommendModal from './components/RecommendModal.jsx';
import TopBar from './components/TopBar.jsx';
import Footer from './components/Footer.jsx';
import Toast from './components/Toast.jsx';
import { useThemeSync } from './hooks/useThemeSync.js';
import { useLoadBakeries } from './hooks/useLoadBakeries.js';
import { useRestoreSession } from './hooks/useRestoreSession.js';

export default function App() {
  useThemeSync();
  useLoadBakeries();
  useRestoreSession();

  return (
    <>
      <div className="app">
        <TopBar />
        <main>
          {/* uianimation.md 8): 페이지 전환(라우팅) 애니메이션은 이번 범위에서 제외했다 — MapScreen이
              언마운트될 때 네이버지도 인스턴스를 정리하는 로직이 이미 까다로운데(teardownMap 참고),
              AnimatePresence로 화면 전환 중 두 라우트가 동시에 걸쳐 있는 구간이 생기면 그 정리
              타이밍과 얽혀 지도 쪽에서 예외가 날 위험이 커서 공수 대비 효과가 낮다고 판단. */}
          <Routes>
            <Route path="/" element={<MapScreen />} />
            <Route path="/list" element={<ListScreen />} />
            <Route path="/route" element={<RouteScreen />} />
            <Route path="/mypage" element={<MyPageScreen />} />
          </Routes>
        </main>
        <Footer />
      </div>
      <AuthModal />
      <RecommendModal />
      <Toast />
    </>
  );
}
