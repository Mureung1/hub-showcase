import StatusBadge from './StatusBadge.jsx';
import { HeartIcon, PinIcon, PhoneIcon, ClockIcon, CloseIcon } from './icons.jsx';

// 지도 화면 상세 패널에서 선택된 빵집 하나를 보여주는 카드(평점/리뷰 포함).
export default function SelectionCard({ bakery, liked, onRemove, onToggleWishlist }) {
  const filled = Math.round(bakery.rating);
  return (
    <div className="selection-card">
      <button type="button" className="remove-btn" aria-label={`${bakery.name} 선택 해제`} onClick={onRemove}>
        <CloseIcon style={{ width: 11, height: 11 }} />
      </button>
      <div className="selection-card-head">
        <h4>
          {bakery.name}
          <StatusBadge bakery={bakery} tag="status-chip" />
        </h4>
        <button
          type="button"
          className={`heart-btn${liked ? ' active' : ''}`}
          aria-label="찜하기"
          onClick={onToggleWishlist}
        >
          <HeartIcon />
        </button>
      </div>
      <div className="rating-row">
        {'★'.repeat(filled)}
        {'☆'.repeat(5 - filled)}
        <span>{bakery.rating.toFixed(1)}</span>
      </div>
      <div className="detail-row">
        <span className="label">
          <PinIcon />
          대표 빵
        </span>
        <span>{bakery.menu}</span>
      </div>
      <div className="detail-row">
        <span className="label">
          <PhoneIcon />
          전화
        </span>
        <span>{bakery.phone}</span>
      </div>
      <div className="detail-row" style={{ borderBottom: 'none' }}>
        <span className="label">
          <ClockIcon />
          몰리는 시간
        </span>
        <span>{bakery.busy}</span>
      </div>
      <div className="review-list">
        {bakery.reviews.map((r) => (
          <div className="review-item" key={r}>
            “{r}”
          </div>
        ))}
      </div>
    </div>
  );
}
