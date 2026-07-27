import StatusBadge from './StatusBadge.jsx';
import { HeartIcon, CheckCircleIcon, PinIcon, MapIcon, ClockIcon, CloseIcon } from './icons.jsx';

// 지도 화면 상세 패널에서 선택된 빵집 하나를 보여주는 카드.
// 평점/리뷰/전화번호는 실데이터에 없는 필드라 뺐다 — 있는 필드(주소/대표메뉴/몰리는시간/휴무일)만 있을 때만 보여준다.
export default function SelectionCard({ bakery, liked, visited, distanceKm, onRemove, onToggleWishlist, onToggleVisited }) {
  return (
    <div className="selection-card">
      <button type="button" className="remove-btn" aria-label={`${bakery.name} 선택 해제`} onClick={onRemove}>
        <CloseIcon style={{ width: 11, height: 11 }} />
      </button>
      <div className="selection-card-head">
        <div className="selection-card-title">
          <div className="thumb">
            {bakery.photoUrl && <img src={bakery.photoUrl} alt="" />}
          </div>
          <div className="selection-card-title-body">
            <h4>
              <span className="selection-card-name">{bakery.name}</span>
              <StatusBadge bakery={bakery} tag="status-chip" />
            </h4>
            {distanceKm != null && <span className="selection-card-distance">출발지에서 약 {distanceKm.toFixed(1)}km</span>}
          </div>
        </div>
        <div className="selection-card-actions">
          <button
            type="button"
            className={`visited-btn${visited ? ' active' : ''}`}
            aria-label="가봤어요"
            onClick={onToggleVisited}
          >
            <CheckCircleIcon />
          </button>
          <button
            type="button"
            className={`heart-btn${liked ? ' active' : ''}`}
            aria-label="찜하기"
            onClick={onToggleWishlist}
          >
            <HeartIcon />
          </button>
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
      {bakery.comment && (
        <div className="review-list">
          <div className="review-item">“{bakery.comment}”</div>
        </div>
      )}
    </div>
  );
}
