// ============================================================================
// App.jsx — 라우팅(주소 → 화면) 규칙 정의
// ----------------------------------------------------------------------------
// [SPA(Single Page Application)] 이 앱은 페이지를 통째로 새로고침하지 않고, URL이 바뀌면
//   라우터가 "그 URL에 맞는 컴포넌트"로 화면만 갈아끼운다(빠르고 매끄러움). 우리 앱의 홈↔결과
//   전환이 새로고침 없이 즉각적인 이유가 이것.
//   /          → 검색 홈(SearchHome)
//   /results   → 검색 결과(SearchResults)
//   그 외 전부 → 홈으로 돌려보냄
// ============================================================================

import { Routes, Route, Navigate } from 'react-router-dom';
import SearchHome from './pages/SearchHome.jsx';
import SearchResults from './pages/SearchResults.jsx';

// 컴포넌트 = 화면을 그리는 함수. return 하는 JSX가 곧 화면이 된다.
function App() {
  return (
    <div className="app">
      {/* Routes: 자식 Route들 중 현재 URL과 매칭되는 "하나"만 렌더한다. */}
      <Routes>
        {/* path(주소 패턴)와 element(그 주소일 때 그릴 컴포넌트)를 짝지운다. */}
        <Route path="/" element={<SearchHome />} />
        <Route path="/results" element={<SearchResults />} />
        {/* TODO: 상세 화면 — :id 는 URL 파라미터(가변값). 백엔드 상세 API 준비 후 추가
            <Route path="/parking-lots/:id" element={<ParkingLotDetail />} /> */}
        {/* path="*" = 위 어디에도 안 맞는 주소 → 홈으로 리다이렉트(replace=뒤로가기 기록 안 남김) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App; // 이 컴포넌트를 다른 파일(main.jsx)에서 import 하도록 내보낸다.
