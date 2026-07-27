// ============================================================================
// components/SearchBar.jsx — 목적지 검색 입력창(홈·결과 화면 공용)
// ----------------------------------------------------------------------------
// [props] 부모가 넘겨주는 설정값(함수 매개변수처럼). 같은 컴포넌트를 상황별로 재사용하게 해준다.
// [제어 컴포넌트(controlled component)] React 입력창의 표준 패턴:
//   value={state}로 "보일 값"을 React가 쥐고, onChange로 타이핑을 state에 반영 →
//   화면과 데이터가 항상 일치(단일 출처). 우리는 이 값을 제출 시 URL로 보낸다.
// ============================================================================

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SearchIcon from './SearchIcon.jsx';

/**
 * 목적지 검색 입력창. 홈·목적지 선택·검색 결과 화면에서 공통으로 재사용한다.
 * 제출 시 /places?keyword=... (목적지 선택 화면)으로 이동한다.
 * 검색어만으로는 어느 장소인지 확정할 수 없으므로, 주차장 목록으로 바로 가지 않고
 * 사용자가 후보 중 목적지를 고르는 화면을 먼저 거친다.
 *
 * @param {string}  defaultValue 초기 검색어(결과 화면에서 현재 검색어 표시)
 * @param {boolean} showClear    지우기(×) 버튼 노출 여부(결과 화면)
 * @param {boolean} autoFocus    자동 포커스 여부(홈)
 * @param {string}  placeholder  placeholder 문구
 */
function SearchBar({
  // props를 구조분해하며 각 항목의 기본값 지정(부모가 안 넘기면 이 값 사용).
  defaultValue = '',
  showClear = false,
  autoFocus = false,
  placeholder = '목적지나 장소를 검색해보세요',
}) {
  // [useState] [현재값, 바꾸는 함수]를 준다. setValue를 부르면 React가 재렌더해 화면을 갱신.
  const [value, setValue] = useState(defaultValue);
  const navigate = useNavigate();

  // [useEffect] 지정한 값이 바뀔 때 실행하는 "부수효과". 두 번째 인자 [defaultValue]가
  //   의존성 목록 — 그 값이 바뀔 때만 실행한다. 여기선 URL 검색어가 바뀌면(다른 검색으로
  //   이동) 입력창 값을 그에 맞춰 동기화한다.
  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  // 폼 제출(엔터 또는 검색 버튼) 핸들러.
  const handleSubmit = (event) => {
    event.preventDefault(); // 폼 제출 시 브라우저의 기본 새로고침 동작을 막는다(SPA 유지)
    const query = value.trim();
    if (!query) return;     // 빈 검색어면 무시
    navigate(`/places?keyword=${encodeURIComponent(query)}`);
  };

  return (
    // onSubmit: 폼 제출 시 handleSubmit 실행. role="search"=접근성(검색 영역 표시).
    <form className="search-field" onSubmit={handleSubmit} role="search">
      <SearchIcon />
      <input
        type="text"
        name="keyword"
        value={value}                                      // 화면에 보이는 값 = state(제어 컴포넌트)
        onChange={(event) => setValue(event.target.value)} // 타이핑마다 state 갱신 → 재렌더
        placeholder={placeholder}
        aria-label="목적지 검색"
        autoFocus={autoFocus}
        autoComplete="off"
      />
      {/* [조건부 렌더링] {조건 && <요소>} — 조건이 참일 때만 그 요소를 그린다. */}
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
