// ============================================================================
// pages/SearchResults.jsx — 화면 2: 검색 결과 (주소 "/results")
// ----------------------------------------------------------------------------
// 검색의 "지휘자" 컴포넌트. 하는 일:
//   1) URL(?destination=강남역)에서 목적지를 읽고
//   2) 그 목적지로 백엔드에 검색 요청(useSearchParkingLots 훅)
//   3) 요청 상태(로딩/에러/빈결과/성공)에 따라 알맞은 화면 조각을 렌더한다
//
// [핵심 모델] React는 "state가 바뀌면 컴포넌트 함수를 다시 실행"한다. 훅이 돌려주는
//   isLoading/data 등이 바뀌면 이 함수가 재실행되고, 아래 분기(if)를 다시 평가해 화면이
//   자동으로 로딩→결과로 전환된다. 우리가 DOM을 손으로 바꾸지 않는다(선언형 UI).
// ============================================================================

import { Link, useSearchParams } from 'react-router-dom';
import SearchBar from '../components/SearchBar.jsx';
import ParkingLotCard from '../components/ParkingLotCard.jsx';
import { LoadingState, EmptyState, ErrorState } from '../components/ResultStates.jsx';
import { useSearchParkingLots } from '../hooks/useSearchParkingLots.js';

/** 화면 2: 검색 결과 (/results) */
function SearchResults() {
  // useSearchParams: URL 쿼리스트링(?destination=...)을 읽는 훅.
  const [searchParams] = useSearchParams();
  const destination = (searchParams.get('destination') || '').trim(); // 없으면 '' 로

  // 훅이 돌려주는 여러 상태를 구조분해로 한 번에 받는다.
  //   data=결과 배열, isLoading=최초 로딩중, isError=실패, error=실패 내용,
  //   isFetching=(재)요청 진행중, refetch=수동 재요청 함수
  const { data, isLoading, isError, error, isFetching, refetch } =
    useSearchParkingLots(destination);

  const isNotFound = error?.response?.status === 404; // 장소 못 찾음(HTTP 404)인지
  const parkingLots = data ?? [];                     // [?? 널병합] data가 null/undefined면 [] 사용

  // [파생 상태 + 조건부 렌더링] state로부터 "지금 뭘 보여줄지"를 매 렌더마다 계산한다.
  let content;
  if (!destination) {
    content = (
      <EmptyState title="목적지를 입력해 주세요" sub="검색창에 목적지를 입력해 보세요" />
    );
  } else if (isLoading) {
    content = <LoadingState />;
  } else if (isError && !isNotFound) {
    // 404 외의 오류(네트워크/서버 등) → 다시 시도 화면
    content = <ErrorState onRetry={() => refetch()} isRetrying={isFetching} />;
  } else if (isNotFound || parkingLots.length === 0) {
    // 404(장소 못 찾음) 또는 결과 0개 → 빈 상태 화면
    content = <EmptyState />;
  } else {
    content = (
      // [Fragment] <>...</> 는 화면에 안 나타나는 빈 껍데기. 불필요한 div 없이 여러 요소를 묶는다.
      <>
        <div className="result-meta">
          <div>
            <div className="count">
              {destination} 주변 공영주차장 {parkingLots.length}곳
            </div>
            <div className="sub">가까운 순으로 정렬했어요</div>
          </div>
          <div className="sort">거리순</div>
        </div>
        <div className="card-list">
          {/* 주차장 배열 → 카드 컴포넌트 배열. key=고유 id(안정적 식별자). */}
          {parkingLots.map((parkingLot) => (
            <ParkingLotCard key={parkingLot.id} parkingLot={parkingLot} />
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
        {/* 같은 SearchBar를 props만 다르게 재사용: 현재 검색어 채우고(defaultValue) ×버튼 표시 */}
        <SearchBar defaultValue={destination} showClear />
      </div>
      {content} {/* 위에서 고른 화면 조각을 렌더 */}
    </>
  );
}

export default SearchResults;
