import StatusBadge from './StatusBadge.jsx';
import FeaturedBadge from './FeaturedBadge.jsx';
import { HeartIcon, CheckCircleIcon } from './icons.jsx';

// 리스트 화면의 빵집 카드. components/에 위치 — 화면 간 재사용 가능한 순수 UI 조각.
export default function BakeryCard({
  bakery,
  selected,
  liked,
  visited,
  dim,
  onToggleSelect,
  onToggleWishlist,
  onToggleVisited,
}) {
  const subtitle = [bakery.menu, bakery.price].filter(Boolean).join(' · ');
  return (
    <div className={`list-card${selected ? ' selected' : ''}${dim ? ' dim' : ''}`}>
      <div className="thumb">{bakery.photoUrl && <img src={bakery.photoUrl} alt="" />}</div>
      <div className="info">
        <div className="name">
          <span className="popup-name">{bakery.name}</span>
          {bakery.isFeatured && <FeaturedBadge comment={bakery.comment} />}
          <StatusBadge bakery={bakery} tag="status-chip" />
        </div>
        {subtitle && <div className="menu">{subtitle}</div>}
        <div className="card-actions">
          <button type="button" className="select-btn" onClick={onToggleSelect}>
            {selected ? '선택됨' : '선택하기'}
          </button>
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
    </div>
  );
}
