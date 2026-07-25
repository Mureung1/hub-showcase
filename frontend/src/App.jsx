// ============================================================================
// App.jsx — 라우팅(주소 → 화면) 규칙 정의
// ----------------------------------------------------------------------------
// [SPA(Single Page Application)] 이 앱은 페이지를 통째로 새로고침하지 않고, URL이 바뀌면
//   라우터가 "그 URL에 맞는 컴포넌트"로 화면만 갈아끼운다(빠르고 매끄러움).
//   /                  → 검색 홈(SearchHome)
//   /places            → 목적지 선택(PlaceResults) — 검색어로 찾은 장소 후보 목록
//   /results           → 검색 결과(SearchResults) — 선택한 목적지 주변 주차장
//   /parking-lots/:id  → 주차장 상세(ParkingLotDetail)
//   그 외 전부         → 홈으로 돌려보냄
// ============================================================================

import { Routes, Route, Navigate } from 'react-router-dom';
import SearchHome from './pages/SearchHome.jsx';
import PlaceResults from './pages/PlaceResults.jsx';
import SearchResults from './pages/SearchResults.jsx';
import ParkingLotDetail from './pages/ParkingLotDetail.jsx';

// 컴포넌트 = 화면을 그리는 함수. return 하는 JSX가 곧 화면이 된다.
function App() {
  return (
    <div className="app">
      {/* Routes: 자식 Route들 중 현재 URL과 매칭되는 "하나"만 렌더한다. */}
      <Routes>
        {/* path(주소 패턴)와 element(그 주소일 때 그릴 컴포넌트)를 짝지운다. */}
        <Route path="/" element={<SearchHome />} />
        {/* 검색어(?keyword=)로 장소 후보를 보여주고 목적지를 고르게 하는 화면 */}
        <Route path="/places" element={<PlaceResults />} />
        <Route path="/results" element={<SearchResults />} />
        {/* :id 는 URL 파라미터(가변값) — 카드 클릭 시 /parking-lots/416 같은 주소로 온다. */}
        <Route path="/parking-lots/:id" element={<ParkingLotDetail />} />
        {/* path="*" = 위 어디에도 안 맞는 주소 → 홈으로 리다이렉트(replace=뒤로가기 기록 안 남김) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {/* Routes 밖에 두어 모든 화면(홈·검색·상세) 공통으로 하단에 표시된다. */}
      <Footer />
    </div>
  );
}

// 전역 푸터: 데이터 출처·주의·제보 안내. 서비스 전체가 서울시 공공데이터를 쓰므로 앱 하단 공통.
function Footer() {
  return (
    <footer className="footer">
      <p className="footer-source">데이터 출처 · 서울시 공공데이터 (공영주차장 정보 · 실시간 주차대수)</p>
      <p className="footer-note">공공데이터 기준이며, 실제와 다를 수 있습니다. 정보가 다를 경우 제보 부탁드립니다.</p>
    </footer>
  );
}

export default App; // 이 컴포넌트를 다른 파일(main.jsx)에서 import 하도록 내보낸다.
