// ============================================================================
// pages/PlaceResults.jsx — 화면 2: 목적지 선택 (주소 "/places")
// ----------------------------------------------------------------------------
// 검색어로 찾은 "장소 후보"를 보여주고, 사용자가 목적지를 확정하게 하는 화면.
// 이 화면이 생긴 이유: 예전엔 "이태원 맛집"을 치면 서버가 후보 중 1위를 조용히 골라
//   그 근처 주차장을 보여줬다. 사용자는 어느 장소 기준인지 알 수 없었다.
//
// 흐름:  홈에서 검색  →  [이 화면] 후보 목록  →  하나 선택  →  주차장 목록
//
// 구조는 SearchResults.jsx와 같다(상태별 분기 → 목록 렌더). 익숙한 패턴을 그대로 따랐다.
// ============================================================================

import { Link, useSearchParams } from 'react-router-dom';
import SearchBar from '../components/SearchBar.jsx';
import PlaceCard from '../components/PlaceCard.jsx';
import { LoadingState, EmptyState, ErrorState } from '../components/ResultStates.jsx';
import { useSearchPlaces } from '../hooks/useSearchPlaces.js';

/** 화면 2: 목적지 선택 (/places) */
function PlaceResults() {
  // useSearchParams: URL 쿼리스트링(?keyword=...)을 읽는 훅.
  const [searchParams] = useSearchParams();
  const keyword = (searchParams.get('keyword') || '').trim(); // 없으면 '' 로

  const { data, isLoading, isError, isFetching, refetch } = useSearchPlaces(keyword);

  const places = data ?? []; // [?? 널병합] data가 아직 없으면(로딩 전) 빈 배열로

  // [조건부 렌더링] 지금 무엇을 보여줄지를 매 렌더마다 계산한다.
  //   [주차장 검색과 다른 점] 여기엔 404 분기가 없다. 결과가 없으면 서버가 빈 배열 200을
  //   주기 때문에, "못 찾음"은 오류가 아니라 places.length === 0 으로만 판단하면 된다.
  let content;
  if (!keyword) {
    content = (
      <EmptyState title="목적지를 입력해 주세요" sub="검색창에 목적지를 입력해 보세요" />
    );
  } else if (isLoading) {
    content = <LoadingState label="장소를 찾는 중" />;
  } else if (isError) {
    content = <ErrorState onRetry={() => refetch()} isRetrying={isFetching} />;
  } else if (places.length === 0) {
    content = (
      <EmptyState
        title="목적지를 찾을 수 없어요"
        sub="장소 이름이나 주소를 다시 확인해 주세요"
      />
    );
  } else {
    content = (
      // [Fragment] <>...</> 는 화면에 안 나타나는 빈 껍데기. 불필요한 div 없이 여러 요소를 묶는다.
      <>
        <div className="result-meta">
          <div>
            <div className="count">
              {keyword} 검색 결과 {places.length}곳
            </div>
            <div className="sub">목적지를 선택하면 주변 주차장을 보여드려요</div>
          </div>
        </div>
        <div className="card-list">
          {places.map((place) => (
            // [key] React가 목록의 각 항목을 구별하는 이름표. 장소에는 우리 DB의 id가 없어서
            //   (카카오에서 매번 새로 받아오는 데이터) 이름+좌표를 조합해 고유 키를 만든다.
            //   배열 index를 쓰지 않는 이유: 목록 순서가 바뀌면 엉뚱한 항목이 재사용될 수 있다.
            <PlaceCard
              key={`${place.name}-${place.coordinates.latitude}-${place.coordinates.longitude}`}
              place={place}
            />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      {/* 상단 바: 왼쪽 제목 + 오른쪽 '홈'(첫 화면으로) — 검색 결과 화면과 같은 구성 */}
      <div className="results-top">
        <h1 className="screen-title">목적지 선택</h1>
        <Link className="home-link" to="/">홈</Link>
      </div>
      <div className="pad">
        {/* 검색어를 채워두고 ×버튼 표시 → 바로 다른 키워드로 다시 검색할 수 있다 */}
        <SearchBar defaultValue={keyword} showClear />
      </div>
      {content}
    </>
  );
}

export default PlaceResults;
