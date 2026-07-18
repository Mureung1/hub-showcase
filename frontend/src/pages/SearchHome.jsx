import { useNavigate } from 'react-router-dom';
import SearchBar from '../components/SearchBar.jsx';

// 예시 목적지 칩(프로토타입 index.html 기준)
const EXAMPLE_DESTINATIONS = ['강남역', '서울역', '홍대입구', '코엑스'];

/** 화면 1: 검색 홈 (/) */
function SearchHome() {
  const navigate = useNavigate();

  const goToResults = (destination) => {
    navigate(`/results?destination=${encodeURIComponent(destination)}`);
  };

  return (
    <div className="home">
      <h1 className="logo">차세워</h1>
      <p className="tagline">
        목적지 근처 공영주차장을
        <br />
        빠르게 찾아보세요
      </p>

      <div className="search-form">
        <SearchBar autoFocus />
      </div>

      <p className="section-label">예시 목적지</p>
      <div className="chips">
        {EXAMPLE_DESTINATIONS.map((destination) => (
          <button
            key={destination}
            type="button"
            className="chip"
            onClick={() => goToResults(destination)}
          >
            {destination}
          </button>
        ))}
      </div>
    </div>
  );
}

export default SearchHome;
