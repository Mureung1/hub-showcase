// ============================================================================
// components/PlaceCard.jsx — 목적지 후보 카드 1개
// ----------------------------------------------------------------------------
// [프레젠테이션 컴포넌트] 자체 상태 없이 props(place)를 화면으로만 그린다.
// 표시: 장소 이름 · 주소.
//
// 카드를 누르면 "그 장소의 좌표"를 URL에 담아 주차장 목록 화면으로 이동한다.
// 좌표가 URL에 실리기 때문에 새로고침·링크 공유를 해도 같은 결과가 재현된다.
//
// [CSS를 새로 만들지 않은 이유] ParkingLotCard와 같은 .card / .card-head /
//   .card-title / .card-sub / .chevron 클래스를 그대로 쓴다. 목록 카드라는 성격이
//   같아서 새 스타일이 필요 없다(styles.css 변경 0줄).
// ============================================================================

import { Link } from 'react-router-dom';

/**
 * 목적지 후보 카드.
 * 클릭 시 /results?latitude=..&longitude=..&place=.. 로 이동한다.
 *
 * @param place { name, address, coordinates: { latitude, longitude } }
 */
function PlaceCard({ place }) {
  const { name, address, coordinates } = place;

  // [URLSearchParams] 객체를 "latitude=37.5&longitude=127.0&place=이태원역" 형태의
  //   쿼리스트링으로 만들어 주는 브라우저 내장 도구. 한글·공백처럼 URL에 그냥 쓰면
  //   안 되는 문자를 자동으로 안전하게 인코딩해 준다.
  //   (문자열을 직접 이어붙이면 인코딩을 빠뜨리기 쉬워서 이 방식을 쓴다.)
  //
  // [주의] 좌표는 받은 그대로 넘긴다. 소수점을 반올림하면 수십~수백 m가 어긋난다.
  const query = new URLSearchParams({
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    place: name, // 다음 화면에서 "○○ 주변 공영주차장"처럼 보여주기 위한 표시용
  });

  return (
    // 템플릿 리터럴 안의 query는 자동으로 문자열(toString)로 바뀐다.
    <Link className="card" to={`/results?${query}`}>
      <div className="card-head">
        <span className="card-title">{name}</span>
      </div>
      {/* 주소가 없는 장소(카카오에 주소 정보가 없는 경우)도 있어서 있을 때만 렌더한다. */}
      {address && <div className="card-sub">{address}</div>}
      <span className="chevron" aria-hidden="true">
        &rsaquo;
      </span>
    </Link>
  );
}

export default PlaceCard;
