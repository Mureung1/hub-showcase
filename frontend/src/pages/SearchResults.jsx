import { useSearchParams } from 'react-router-dom';
import SearchBar from '../components/SearchBar.jsx';
import ParkingLotCard from '../components/ParkingLotCard.jsx';
import { LoadingState, EmptyState, ErrorState } from '../components/ResultStates.jsx';
import { useSearchParkingLots } from '../hooks/useSearchParkingLots.js';

/** 화면 2: 검색 결과 (/results) */
function SearchResults() {
  const [searchParams] = useSearchParams();
  const destination = (searchParams.get('destination') || '').trim();

  const { data, isLoading, isError, error, isFetching, refetch } =
    useSearchParkingLots(destination);

  const isNotFound = error?.response?.status === 404;
  const parkingLots = data ?? [];

  let content;
  if (!destination) {
    // 목적지 없이 진입한 경우
    content = (
      <EmptyState title="목적지를 입력해 주세요" sub="검색창에 목적지를 입력해 보세요" />
    );
  } else if (isLoading) {
    content = <LoadingState />;
  } else if (isError && !isNotFound) {
    // 404 외의 오류(네트워크/서버 등) → 다시 시도
    content = <ErrorState onRetry={() => refetch()} isRetrying={isFetching} />;
  } else if (isNotFound || parkingLots.length === 0) {
    // 404(장소 못 찾음) 또는 결과 0개 → 빈 상태
    content = <EmptyState />;
  } else {
    content = (
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
          {parkingLots.map((parkingLot) => (
            <ParkingLotCard key={parkingLot.id} parkingLot={parkingLot} />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="screen-title">검색 결과</h1>
      <div className="pad">
        <SearchBar defaultValue={destination} showClear />
      </div>
      {content}
    </>
  );
}

export default SearchResults;
