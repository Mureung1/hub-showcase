import StatusBadge from './StatusBadge.jsx';
import FeaturedBadge from './FeaturedBadge.jsx';
import { HeartIcon, CheckCircleIcon, PinIcon, MapIcon, ClockIcon, CloseIcon, ExternalLinkIcon, PlusIcon } from './icons.jsx';
import { naverMapSearchUrl } from '../utils/naverMapLink.js';

// 지도에서 마커를 클릭했을 때 뜨는 상세정보 박스. 트레이(우측 리스트의 담은 목록)는 이름만 보여주기로
// 결정하면서, 주소/대표메뉴 같은 상세 정보는 전부 이쪽 마커 클릭 팝업으로 옮겨왔다.
export default function BakeryDetailPopup({
  bakery,
  selected,
  liked,
  visited,
  distanceKm,
  onClose,
  onToggleSelect,
  onToggleWishlist,
  onToggleVisited,
}) {
  return (
    <div className="map-detail-popup">
      <button type="button" className="map-detail-popup-close" aria-label="닫기" onClick={onClose}>
        <CloseIcon style={{ width: 12, height: 12 }} />
      </button>
      <div className="map-detail-popup-head">
        <div className="thumb">{bakery.photoUrl && <img src={bakery.photoUrl} alt="" />}</div>
        <div className="popup-title-body">
          <h4>
            <span className="popup-name">{bakery.name}</span>
            {bakery.isFeatured && <FeaturedBadge comment={bakery.comment} />}
            <StatusBadge bakery={bakery} tag="status-chip" />
          </h4>
          {distanceKm != null && <span className="popup-distance">출발지에서 약 {distanceKm.toFixed(1)}km</span>}
        </div>
      </div>

      {bakery.address && (
        <div className="detail-row">
          <span className="label">
            <MapIcon />
            주소
          </span>
          <span>{bakery.address}</span>
        </div>
      )}
      {bakery.menu && (
        <div className="detail-row">
          <span className="label">
            <PinIcon />
            대표 빵
          </span>
          <span>{bakery.menu}</span>
        </div>
      )}
      {bakery.busy && (
        <div className="detail-row">
          <span className="label">
            <ClockIcon />
            몰리는 시간
          </span>
          <span>{bakery.busy}</span>
        </div>
      )}
      {bakery.closedDays && (
        <div className="detail-row" style={{ borderBottom: 'none' }}>
          <span className="label">휴무일</span>
          <span>{bakery.closedDays}</span>
        </div>
      )}

      {/* 업체가 스스로 등록한 링크(네이버 지역검색 API의 link 필드)는 빵집과 무관한 페이지가
          섞여 있어 믿을 수 없어서, 우리가 직접 확인한 주소로 네이버 지도 검색 결과를 열게 한다
          (naverMapLink.js). */}
      {bakery.address && (
        <a
          className="popup-external-link"
          href={naverMapSearchUrl(bakery)}
          target="_blank"
          rel="noopener noreferrer"
        >
          자세히 보기
          <ExternalLinkIcon style={{ width: 12, height: 12 }} />
        </a>
      )}

      {/* 원형 아이콘+캡션 그리드 — 담기(primary)는 이 앱의 핵심 동작이라는 걸 분명히 보여주려고
          항상 오렌지로 채워두고, 가봤어요/찜하기는 눌렀을 때만 색이 채워지는 기존 규칙을 유지한다
          (전부 오렌지로 채우면 오히려 포인트가 흐려짐 — "확실한 포인트 색"은 딱 여기에만). */}
      <div className="icon-btn-grid">
        <div className="icon-btn-item">
          <button
            type="button"
            className={`icon-btn-circle primary${selected ? ' active' : ''}`}
            aria-label={selected ? '트레이에서 빼기' : '트레이에 담기'}
            onClick={onToggleSelect}
          >
            {selected ? <CheckCircleIcon /> : <PlusIcon />}
          </button>
          <span>{selected ? '담음' : '담기'}</span>
        </div>
        <div className="icon-btn-item">
          <button
            type="button"
            className={`icon-btn-circle visited${visited ? ' active' : ''}`}
            aria-label="가봤어요"
            onClick={onToggleVisited}
          >
            <CheckCircleIcon />
          </button>
          <span>가봤어요</span>
        </div>
        <div className="icon-btn-item">
          <button
            type="button"
            className={`icon-btn-circle heart${liked ? ' active' : ''}`}
            aria-label="찜하기"
            onClick={onToggleWishlist}
          >
            <HeartIcon />
          </button>
          <span>찜하기</span>
        </div>
      </div>
    </div>
  );
}
