import { Routes, Route, useLocation } from 'react-router-dom';
import MapScreen from './screens/MapScreen.jsx';
import ListScreen from './screens/ListScreen.jsx';
import RouteScreen from './screens/RouteScreen.jsx';
import RecommendScreen from './screens/RecommendScreen.jsx';
import MyPageScreen from './screens/MyPageScreen.jsx';
import AuthModal from './screens/AuthModal.jsx';
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

  // 자동 추천받기는 기존 화면과 이어진 페이지가 아니라 독립된 전용 화면처럼 보여야 해서
  // (사용자 요청: "박스로 뜨지 말고 아예 새로운 창처럼"), 이 라우트에서는 평소 앱 껍데기(TopBar/Footer)를 숨긴다.
  const location = useLocation();
  const isRecommend = location.pathname === '/recommend';

  return (
    <>
      <div className="app">
        {!isRecommend && <TopBar />}
        <main>
          <Routes>
            <Route path="/" element={<MapScreen />} />
            <Route path="/list" element={<ListScreen />} />
            <Route path="/route" element={<RouteScreen />} />
            <Route path="/recommend" element={<RecommendScreen />} />
            <Route path="/mypage" element={<MyPageScreen />} />
          </Routes>
        </main>
        {!isRecommend && <Footer />}
      </div>
      <AuthModal />
      <Toast />
    </>
  );
}
