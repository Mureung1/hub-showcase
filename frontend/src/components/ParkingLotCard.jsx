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
//
// [목적지를 상세로 넘기는 이유] 도보거리는 주차장의 속성이 아니라 "주차장 ↔ 목적지" 관계라,
//   상세 화면도 목적지를 알아야 계산할 수 있다. 그래서 카드가 링크를 만들 때 지금 보고 있는
//   목적지를 쿼리로 함께 실어 보낸다. URL에 담기므로 새로고침·공유에도 그대로 재현된다.
// ============================================================================

import { Link } from 'react-router-dom';
import {
  STRAIGHT_DISTANCE_NOTE,
  isWalkingDistance,
  toDistanceText,
} from '../utils/distanceText.js';
import { toRealtimeStatus } from '../utils/realtimeStatus.js';

/**
 * 상세 화면 주소를 만든다. 목적지가 있으면 좌표와 장소명을 쿼리로 함께 싣는다.
 *
 * [URLSearchParams] 쿼리스트링을 안전하게 조립해 주는 브라우저 내장 객체.
 *   한글 장소명("이태원역 6호선")이나 공백도 알아서 인코딩해 준다(직접 문자열을 이어붙이면
 *   깨지기 쉽다). 문자열 자리에 쓰면 자동으로 "a=1&b=2" 형태가 된다.
 *
 * @param {number} id 주차장 id
 * @param {{latitude?: string, longitude?: string, placeName?: string}} [destination] 목적지
 * @returns {string} 예) "/parking-lots/416?latitude=37.53&longitude=126.99&place=이태원역"
 */
function buildDetailPath(id, destination) {
  // 목적지가 없으면(좌표 없이 목록에 들어온 경우 등) 좌표 없는 주소를 그대로 준다.
  // 서버는 이때 거리 정보를 빼고 나머지 상세만 내려준다.
  if (!destination?.latitude || !destination?.longitude) {
    return `/parking-lots/${id}`;
  }

  const params = new URLSearchParams({
    latitude: destination.latitude,
    longitude: destination.longitude,
  });
  // 장소명은 화면 표시용(기준점 문구)이라 있을 때만 싣는다. 서버는 좌표만 쓴다.
  if (destination.placeName) {
    params.set('place', destination.placeName);
  }

  return `/parking-lots/${id}?${params}`;
}

/**
 * 주차장 검색 결과 카드.
 * 카드 클릭 시 상세 라우트(/parking-lots/:id)로 이동한다.
 */
function ParkingLotCard({ parkingLot, destination }) {
  // props 객체에서 필요한 필드만 구조분해로 꺼낸다.
  const { id, name, address, distance, distanceType, walkingSeconds, payType, realtimeStatus } =
    parkingLot;

  const isFree = payType === 'FREE'; // 백엔드 enum 문자열 → 화면용 boolean 으로 파생
  // realtimeStatus(문자열/null) → { label 한글, modifier 색클래스 }. 없으면 '정보없음'.
  const status = toRealtimeStatus(realtimeStatus);

  // 도보 경로를 구했는지 여부. 못 구했으면 distance가 직선거리라는 뜻이다.
  const isWalking = isWalkingDistance(distanceType);
  // "도보 12분 · 890m" / 도보 정보가 없으면 "420m" 만
  const distanceText = toDistanceText({ distance, distanceType, walkingSeconds });

  return (
    // [Link] a태그처럼 보이지만, 클릭 시 전체 새로고침 없이 라우터가 화면만 전환(SPA).
    <Link className="card" to={buildDetailPath(id, destination)}>
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
      {!isWalking && <div className="card-sub">{STRAIGHT_DISTANCE_NOTE}</div>}
      <span className="chevron" aria-hidden="true">
        &rsaquo;
      </span>
    </Link>
  );
}

export default ParkingLotCard;
