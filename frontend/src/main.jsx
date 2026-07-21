// ============================================================================
// main.jsx — 앱의 "시작점"(entry point)
// ----------------------------------------------------------------------------
// 브라우저는 index.html을 열고 거기 연결된 이 파일을 가장 먼저 실행한다.
// 여기서 React 앱을 화면(index.html의 <div id="root">) 안에 "그려 넣는다(render)".
//
// [React가 화면을 그리는 방식] 우리가 만든 컴포넌트(함수)들을 실행해 "지금 화면이 어때야
//   하는지"를 계산하고(가상 트리), 실제 브라우저 DOM에서 바뀐 부분만 갱신한다. state(상태)가
//   바뀌면 관련 컴포넌트를 다시 실행(re-render)해 화면을 자동 최신화한다 → 우리 검색 화면이
//   "로딩 → 결과"로 알아서 바뀌는 것도 이 원리(우리가 DOM을 직접 안 건드림).
// [JSX] 아래 <React.StrictMode>...처럼 JS 안에 HTML을 쓴 문법. 빌드 시 함수 호출로 바뀐다.
// [Provider 패턴] <A><B/></A> 로 감싸면 A가 B(하위 전부)에게 기능을 "공급". 덕분에 깊은
//   컴포넌트도 props를 일일이 안 받고 그 기능(서버데이터·라우팅)을 쓸 수 있다.
//
// [이 앱의 전체 흐름 — 검색 한 번의 여정]
//   1) 홈(/)에서 목적지 입력 or 예시 칩 클릭 → URL을 /results?destination=강남역 로 변경
//   2) 라우터가 URL을 보고 SearchResults 페이지를 렌더
//   3) SearchResults가 URL에서 destination을 읽어 useSearchParkingLots 훅 호출
//   4) 훅(react-query) → searchParkingLots() → axios가 GET /api/parking-lots 요청
//        → vite 프록시가 백엔드(localhost:8080)로 전달
//   5) 응답 상태(로딩/에러/빈결과/성공)에 따라 알맞은 화면 조각을 렌더
// ============================================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
// [CSS import] JS에서 CSS를 import하면 vite가 페이지에 주입한다.
// 디자인 토큰 원본(단일 소스)을 먼저 로드해 :root 변수를 정의한 뒤 앱 스타일을 얹는다.
import '../../docs/design/tokens.css';
import './styles.css';

// react-query(서버 데이터 관리 라이브러리)의 "본부(캐시 저장소)".
// 받아온 응답을 캐시에 저장해두고, 로딩/에러 상태와 재요청까지 대신 관리한다.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // 다른 창 갔다 와도 자동 재요청 안 함(불필요한 호출 방지)
      staleTime: 60 * 1000,        // 받은 데이터를 60초간 "신선"으로 취급(그동안 재요청 X)
    },
  },
});

// createRoot(...).render(...) = "이 DOM 요소 안에 이 React 트리를 그려라".
ReactDOM.createRoot(document.getElementById('root')).render(
  // StrictMode: 개발 모드 전용 검사 도구(잠재 버그 경고 + 일부 로직 2번 실행해 부작용을
  //   드러냄). 최종 배포 화면엔 영향 없다.
  <React.StrictMode>
    {/* Provider들을 바깥에 감싸 앱 전체가 그 기능(서버데이터/라우팅)을 쓰게 한다. */}
    <QueryClientProvider client={queryClient}>
      {/* BrowserRouter: 브라우저 주소(URL) 변화를 감지해 화면을 바꿀 수 있게 해준다. */}
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
