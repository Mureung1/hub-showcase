import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SearchIcon from './SearchIcon.jsx';

/**
 * 목적지 검색 입력창. 홈·검색 결과 화면에서 공통으로 재사용한다.
 * 제출 시 /results?destination=... 로 이동한다.
 *
 * @param {string}  defaultValue 초기 검색어(결과 화면에서 현재 검색어 표시)
 * @param {boolean} showClear    지우기(×) 버튼 노출 여부(결과 화면)
 * @param {boolean} autoFocus    자동 포커스 여부(홈)
 * @param {string}  placeholder  placeholder 문구
 */
function SearchBar({
  defaultValue = '',
  showClear = false,
  autoFocus = false,
  placeholder = '목적지나 장소를 검색해보세요',
}) {
  const [value, setValue] = useState(defaultValue);
  const navigate = useNavigate();

  // URL의 목적지가 바뀌면(다른 검색으로 이동) 입력값을 동기화한다.
  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const query = value.trim();
    if (!query) return;
    navigate(`/results?destination=${encodeURIComponent(query)}`);
  };

  return (
    <form className="search-field" onSubmit={handleSubmit} role="search">
      <SearchIcon />
      <input
        type="text"
        name="destination"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label="목적지 검색"
        autoFocus={autoFocus}
        autoComplete="off"
      />
      {showClear && (
        <Link className="clear" to="/" aria-label="검색어 지우고 홈으로">
          &times;
        </Link>
      )}
      <button type="submit" className="visually-hidden">
        검색
      </button>
    </form>
  );
}

export default SearchBar;
