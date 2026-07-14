import { Routes, Route } from 'react-router-dom';
import MapScreen from './screens/MapScreen.jsx';
import ListScreen from './screens/ListScreen.jsx';
import RouteScreen from './screens/RouteScreen.jsx';
import ChatScreen from './screens/ChatScreen.jsx';
import MyPageScreen from './screens/MyPageScreen.jsx';
import AuthModal from './screens/AuthModal.jsx';
import BgDecor from './components/BgDecor.jsx';
import TopBar from './components/TopBar.jsx';
import Footer from './components/Footer.jsx';
import Toast from './components/Toast.jsx';
import { useThemeSync } from './hooks/useThemeSync.js';

export default function App() {
  useThemeSync();

  return (
    <>
      <BgDecor />
      <div className="app">
        <TopBar />
        <main>
          <Routes>
            <Route path="/" element={<MapScreen />} />
            <Route path="/list" element={<ListScreen />} />
            <Route path="/route" element={<RouteScreen />} />
            <Route path="/chat" element={<ChatScreen />} />
            <Route path="/mypage" element={<MyPageScreen />} />
          </Routes>
        </main>
        <Footer />
      </div>
      <AuthModal />
      <Toast />
    </>
  );
}
