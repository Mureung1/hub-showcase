// ============================================================================
// components/ParkingLotCard.jsx — 검색 결과 카드 1개
// ----------------------------------------------------------------------------
// [프레젠테이션 컴포넌트] 자체 상태 없이, 부모가 준 props(parkingLot)를 화면으로만 그린다.
// 표시: 이름 · 유료/무료 뱃지 · 실시간 혼잡 상태 뱃지 · 주소 · 거리(+도보 시간).
//
// [백엔드 계약] 검색 API(GET /api/parking-lots)가 주는 항목:
//   id, name, address, payType, realtimeStatus(없으면 null)
//   distance        거리(m) — 도보거리. 도보 경로를 못 구했으면 직선거리
//   distanceType    "WALKING" | "STRAIGHT"  ← distance가 무슨 거리인지
//   walkingSeconds  도보 시간(초). 못 구했으면 null
//
//   서버는 "무슨 거리를 얼마나"라는 사실만 주고, 그걸 화면에 어떻게 쓸지는 여기서 정한다.
// ============================================================================

import { Link } from 'react-router-dom';
import { formatDistance } from '../utils/formatDistance.js';
import { formatWalkingTime } from '../utils/formatWalkingTime.js';
import { toRealtimeStatus } from '../utils/realtimeStatus.js';

// 도보 경로를 구하지 못해 직선거리를 대신 보여줄 때의 안내 문구.
// 이유(도보 정보 없음)와 지금 보이는 값의 정체(직선거리)를 함께 알려준다.
const STRAIGHT_DISTANCE_NOTE = '도보 정보가 없어 직선거리를 표시했어요';

/**
 * 주차장 검색 결과 카드.
 * 카드 클릭 시 상세 라우트(/parking-lots/:id)로 이동한다.
 */
function ParkingLotCard({ parkingLot }) {
  // props 객체에서 필요한 필드만 구조분해로 꺼낸다.
  const { id, name, address, distance, distanceType, walkingSeconds, payType, realtimeStatus } =
    parkingLot;

  const isFree = payType === 'FREE'; // 백엔드 enum 문자열 → 화면용 boolean 으로 파생
  // realtimeStatus(문자열/null) → { label 한글, modifier 색클래스 }. 없으면 '정보없음'.
  const status = toRealtimeStatus(realtimeStatus);

  // 도보 경로를 구했는지 여부. 못 구했으면 distance가 직선거리라는 뜻이다.
  const isWalkingDistance = distanceType === 'WALKING';
  // "도보 12분 · 890m" / 도보 정보가 없으면 "420m" 만
  const distanceText = isWalkingDistance
    ? `${formatWalkingTime(walkingSeconds)} · ${formatDistance(distance)}`
    : formatDistance(distance);

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
      <div className="card-dist">{distanceText}</div>
      {/* 직선거리일 때만 안내 문구. 주소 줄과 같은 .card-sub(작은 회색)를 재사용해 CSS 추가가 없다. */}
      {!isWalkingDistance && <div className="card-sub">{STRAIGHT_DISTANCE_NOTE}</div>}
      <span className="chevron" aria-hidden="true">
        &rsaquo;
      </span>
    </Link>
  );
}

export default ParkingLotCard;
