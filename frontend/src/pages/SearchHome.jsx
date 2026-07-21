// ============================================================================
// pages/SearchHome.jsx — 화면 1: 검색 홈 (주소 "/")
// ----------------------------------------------------------------------------
// 로고 + 검색창(SearchBar) + 예시 목적지 칩을 보여주는 첫 화면.
// 칩을 누르면 그 목적지로 곧장 결과 화면으로 이동한다.
// ============================================================================

import { useNavigate } from 'react-router-dom';
import SearchBar from '../components/SearchBar.jsx';

// [컴포넌트 밖 상수] 렌더링마다 새로 만들 필요 없는 고정값은 컴포넌트 밖에 둔다.
//   (안에 두면 렌더될 때마다 배열이 새로 생성돼 낭비이자 불필요한 재계산을 유발할 수 있음)
const EXAMPLE_DESTINATIONS = ['강남역', '서울역', '홍대입구', '코엑스'];

/** 화면 1: 검색 홈 (/) */
function SearchHome() {
  // useNavigate: "코드로" 페이지를 이동시키는 함수를 준다(Link=클릭 이동, 이건 로직 이동).
  const navigate = useNavigate();

  // 목적지를 쿼리스트링에 실어 결과 화면으로 이동.
  // encodeURIComponent: 한글/공백/특수문자를 URL에 안전한 형태로 인코딩(예: 공백→%20).
  const goToResults = (destination) => {
    navigate(`/results?destination=${encodeURIComponent(destination)}`);
  };

  // return 하는 JSX가 화면. className은 HTML의 class(=CSS와 연결).
  return (
    <div className="home">
      <h1 className="logo">차세워</h1>
      <p className="tagline">
        목적지 근처 공영주차장을
        <br />
        빠르게 찾아보세요
      </p>

      <div className="search-form">
        {/* 검색창 컴포넌트 재사용. autoFocus 처럼 값을 넘기는 게 props 전달. */}
        <SearchBar autoFocus />
      </div>

      <p className="section-label">예시 목적지</p>
      <div className="chips">
        {/* [리스트 렌더링] 배열.map()으로 데이터 배열 → JSX 요소 배열로 변환.
            React에서 목록을 그리는 표준 방식이다. */}
        {EXAMPLE_DESTINATIONS.map((destination) => (
          <button
            key={destination}                        // [key] 목록 항목을 식별하는 고유값(재렌더 최적화에 필수)
            type="button"
            className="chip"
            onClick={() => goToResults(destination)} // [이벤트] 클릭 시 실행할 함수를 넘긴다
          >
            {destination}                            {/* {} 안에 JS 값을 화면에 삽입 */}
          </button>
        ))}
      </div>
    </div>
  );
}

export default SearchHome;
