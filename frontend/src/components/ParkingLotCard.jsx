// ============================================================================
// components/ParkingLotCard.jsx — 검색 결과 카드 1개
// ----------------------------------------------------------------------------
// [프레젠테이션 컴포넌트] 자체 상태 없이, 부모가 준 props(parkingLot)를 화면으로만 그린다.
// 표시: 이름 · 유료/무료 뱃지 · 실시간 혼잡 상태 뱃지 · 주소 · 거리.
//
// [백엔드 계약] 검색 API(GET /api/parking-lots)가 주는 항목:
//   id, name, address, distance, payType, realtimeStatus(실시간 혼잡 상태, 없으면 null)
//   목록에서는 정확한 가용 대수 대신 realtimeStatus(여유/보통/혼잡/만차/정보없음)만 보여준다.
// ============================================================================

import { Link } from 'react-router-dom';
import { formatDistance } from '../utils/formatDistance.js';
import { toRealtimeStatus } from '../utils/realtimeStatus.js';

/**
 * 주차장 검색 결과 카드.
 * 카드 클릭 시 상세 라우트(/parking-lots/:id)로 이동한다.
 * (정확한 가용 대수·도보시간은 상세 화면에서 제공)
 */
function ParkingLotCard({ parkingLot }) {
  // props 객체에서 필요한 필드만 구조분해로 꺼낸다.
  const { id, name, address, distance, payType, realtimeStatus } = parkingLot;
  const isFree = payType === 'FREE'; // 백엔드 enum 문자열 → 화면용 boolean 으로 파생
  // realtimeStatus(문자열/null) → { label 한글, modifier 색클래스 }. 없으면 '정보없음'.
  const status = toRealtimeStatus(realtimeStatus);

  return (
    // [Link] a태그처럼 보이지만, 클릭 시 전체 새로고침 없이 라우터가 화면만 전환(SPA).
    <Link className="card" to={`/parking-lots/${id}`}>
      <div className="card-head">
        <span className="card-title">{name}</span>
        <span className="tags">
          {/* 실시간 혼잡 상태 뱃지: modifier(ok/warn/busy/none)에 따라 색이 달라진다. */}
          <span className={`badge badge--${status.modifier}`}>
            {status.label}
          </span>
          {/* [템플릿 리터럴] 무료/유료에 따라 뱃지 클래스를 바꾼다. */}
          <span className={`badge ${isFree ? 'badge--free' : 'badge--paid'}`}>
            {isFree ? '무료' : '유료'}
          </span>
        </span>
      </div>
      {/* address가 있을 때만 렌더(&&). 값이 없으면 아무 것도 안 그림. */}
      {address && <div className="card-sub">{address}</div>}
      {/* 숫자(미터) → "320m"/"1.2km" 로 변환하는 유틸을 거쳐 표시(표시 로직 분리) */}
      <div className="card-dist">{formatDistance(distance)}</div>
      <span className="chevron" aria-hidden="true">
        &rsaquo;
      </span>
    </Link>
  );
}

export default ParkingLotCard;
