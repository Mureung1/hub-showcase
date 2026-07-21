// ============================================================================
// components/ParkingLotCard.jsx — 검색 결과 카드 1개
// ----------------------------------------------------------------------------
// [프레젠테이션 컴포넌트] 자체 상태 없이, 부모가 준 props(parkingLot)를 화면으로만 그린다.
//   "데이터 받아 표시만" 하는 작은 컴포넌트로 쪼개면 재사용·테스트가 쉽다.
// 표시: 이름 · 유료/무료 뱃지 · 주소 · 거리.
// ============================================================================

import { Link } from 'react-router-dom';
import { formatDistance } from '../utils/formatDistance.js';

/**
 * 주차장 검색 결과 카드.
 * (실시간 여유·도보시간은 백엔드 미구현이라 이번 범위에서 제외)
 * 카드 클릭 시 상세 라우트로 이동하도록 링크를 걸어 두었으나,
 * 상세 페이지 자체는 백엔드 상세 API 준비 후 구현 예정(TODO).
 */
function ParkingLotCard({ parkingLot }) {
  // props 객체에서 필요한 필드만 구조분해로 꺼낸다.
  const { id, name, address, distance, payType } = parkingLot;
  const isFree = payType === 'FREE'; // 백엔드 enum 문자열 → 화면용 boolean 으로 파생

  return (
    // [Link] a태그처럼 보이지만, 클릭 시 전체 새로고침 없이 라우터가 화면만 전환(SPA).
    <Link className="card" to={`/parking-lots/${id}`}>
      <div className="card-head">
        <span className="card-title">{name}</span>
        <span className="tags">
          {/* [템플릿 리터럴] `...${}...` 로 문자열 조합 — 무료/유료에 따라 뱃지 클래스를 바꾼다. */}
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
