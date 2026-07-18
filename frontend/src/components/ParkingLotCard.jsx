import { Link } from 'react-router-dom';
import { formatDistance } from '../utils/formatDistance.js';

/**
 * 주차장 검색 결과 카드.
 * 표시 정보: 이름 · 유료/무료 뱃지 · 주소 · 거리.
 * (실시간 여유·도보시간은 백엔드 미구현이라 이번 범위에서 제외)
 *
 * 카드 클릭 시 상세 라우트로 이동하도록 링크를 걸어 두었으나,
 * 상세 페이지 자체는 백엔드 상세 API 준비 후 구현 예정(TODO).
 */
function ParkingLotCard({ parkingLot }) {
  const { id, name, address, distance, payType } = parkingLot;
  const isFree = payType === 'FREE';

  return (
    <Link className="card" to={`/parking-lots/${id}`}>
      <div className="card-head">
        <span className="card-title">{name}</span>
        <span className="tags">
          <span className={`badge ${isFree ? 'badge--free' : 'badge--paid'}`}>
            {isFree ? '무료' : '유료'}
          </span>
        </span>
      </div>
      {address && <div className="card-sub">{address}</div>}
      <div className="card-dist">{formatDistance(distance)}</div>
      <span className="chevron" aria-hidden="true">
        &rsaquo;
      </span>
    </Link>
  );
}

export default ParkingLotCard;
