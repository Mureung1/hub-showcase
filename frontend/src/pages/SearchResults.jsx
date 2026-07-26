// ============================================================================
// pages/SearchResults.jsx — 화면 3: 검색 결과 (주소 "/results")
// ----------------------------------------------------------------------------
// 선택한 목적지 주변 주차장을 거리순으로 보여주는 화면. 하는 일:
//   1) URL(?latitude=37.53&longitude=126.99&place=이태원역 6호선)에서 목적지 좌표를 읽고
//   2) 그 좌표로 백엔드에 검색 요청(useSearchParkingLots 훅)
//   3) 요청 상태(로딩/에러/빈결과/성공)에 따라 알맞은 화면 조각을 렌더한다
//
// [왜 좌표가 URL에 있나] 목적지는 앞 화면(/places)에서 사용자가 고른다. 그 장소의 좌표를
//   URL에 실어 오기 때문에 새로고침·뒤로가기·링크 공유를 해도 같은 결과가 재현된다.
//   place는 화면에 "○○ 주변"이라고 보여주기 위한 표시용이고, 서버는 좌표만 쓴다.
//
// [핵심 모델] React는 "state가 바뀌면 컴포넌트 함수를 다시 실행"한다. 훅이 돌려주는
//   isLoading/data 등이 바뀌면 이 함수가 재실행되고, 아래 분기(if)를 다시 평가해 화면이
//   자동으로 로딩→결과로 전환된다. 우리가 DOM을 손으로 바꾸지 않는다(선언형 UI).
// ============================================================================

import { Link, Navigate, useSearchParams } from 'react-router-dom';
import SearchBar from '../components/SearchBar.jsx';
import ParkingLotCard from '../components/ParkingLotCard.jsx';
import { LoadingState, EmptyState, ErrorState } from '../components/ResultStates.jsx';
import { useSearchParkingLots } from '../hooks/useSearchParkingLots.js';

/** 화면 3: 검색 결과 (/results) */
function SearchResults() {
  // useSearchParams: URL 쿼리스트링(?latitude=...)을 읽는 훅.
  const [searchParams] = useSearchParams();
  const latitude = searchParams.get('latitude');
  const longitude = searchParams.get('longitude');
  const placeName = searchParams.get('place') ?? ''; // 표시용 장소 이름
  // 예전 주소(/results?destination=강남역)로 들어온 경우를 위한 값. 아래에서 리다이렉트한다.
  const legacyDestination = searchParams.get('destination');

  const hasCoordinates = Boolean(latitude && longitude);

  // [훅 규칙 — 중요] 훅은 항상 컴포넌트 최상단에서, 매 렌더마다 "같은 순서로" 호출해야 한다.
  //   그래서 리다이렉트나 안내 화면을 이유로 여기서 먼저 return 하면 안 된다(호출 순서가
  //   렌더마다 달라져 규칙 위반). 훅은 무조건 호출하고 — 좌표가 없으면 enabled:false라
  //   요청 자체는 나가지 않는다 — 화면 분기는 아래 content에서만 한다.
  const { data, isLoading, isError, isFetching, refetch } =
    useSearchParkingLots({ latitude, longitude });

  const parkingLots = data ?? []; // [?? 널병합] data가 null/undefined면 [] 사용

  // [파생 상태 + 조건부 렌더링] state로부터 "지금 뭘 보여줄지"를 매 렌더마다 계산한다.
  let content;
  if (legacyDestination && !hasCoordinates) {
    // 예전 주소로 들어온 경우(북마크·브라우저 히스토리) → 목적지 선택 화면으로 넘긴다.
    // replace: 뒤로가기 기록에 남기지 않아, 뒤로 눌렀을 때 이 주소로 다시 오지 않는다.
    content = (
      <Navigate to={`/places?keyword=${encodeURIComponent(legacyDestination)}`} replace />
    );
  } else if (!hasCoordinates) {
    content = (
      <EmptyState title="목적지를 먼저 선택해 주세요" sub="검색창에 목적지를 입력해 보세요" />
    );
  } else if (isLoading) {
    content = <LoadingState />;
  } else if (isError) {
    content = <ErrorState onRetry={() => refetch()} isRetrying={isFetching} />;
  } else if (parkingLots.length === 0) {
    // 주변에 주차장이 없으면 빈 배열 200이 온다(오류가 아님).
    // 서울 밖 목적지를 고른 경우가 많아 안내 문구로 이유를 알려준다.
    content = (
      <EmptyState sub="서울시 공영주차장 정보만 제공해요. 다른 목적지로 검색해 보세요" />
    );
  } else {
    content = (
      // [Fragment] <>...</> 는 화면에 안 나타나는 빈 껍데기. 불필요한 div 없이 여러 요소를 묶는다.
      <>
        <div className="result-meta">
          <div>
            <div className="count">
              {placeName || '선택한 목적지'} 주변 공영주차장 {parkingLots.length}곳
            </div>
            <div className="sub">가까운 순으로 정렬했어요</div>
          </div>
          <div className="sort">거리순</div>
        </div>
        <div className="card-list">
          {/* 주차장 배열 → 카드 컴포넌트 배열. key=고유 id(안정적 식별자).
              destination: 카드가 상세 링크에 목적지를 실어 보내기 위한 값.
              상세 화면도 "주차장 ↔ 목적지" 거리를 계산하려면 목적지를 알아야 한다. */}
          {parkingLots.map((parkingLot) => (
            <ParkingLotCard
              key={parkingLot.id}
              parkingLot={parkingLot}
              destination={{ latitude, longitude, placeName }}
            />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      {/* 상단 바: 왼쪽 제목 + 오른쪽 '홈'(첫 화면으로) */}
      <div className="results-top">
        <h1 className="screen-title">검색 결과</h1>
        <Link className="home-link" to="/">홈</Link>
      </div>
      <div className="pad">
        {/* 선택한 장소 이름을 채워두고 ×버튼 표시 → 바로 다른 목적지로 다시 검색 가능 */}
        <SearchBar defaultValue={placeName} showClear />
      </div>
      {content} {/* 위에서 고른 화면 조각을 렌더 */}
    </>
  );
}

export default SearchResults;
