import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Star, ExternalLink } from 'lucide-react';
import type { GymPlace } from '../../data/userMock';
import GymThumbnail from './GymThumbnail';
import { hasGymRating, hasNaverExternalLink, isNaverSourcedGym } from '../../utils/gymProfile';
import './map.css';

interface GymBottomSheetProps {
  gyms: GymPlace[];
  selectedGym: GymPlace | null;
  onSelectGym: (gymId: string) => void;
  onConsult: () => void;
  refreshing?: boolean;
}

const DRAG_THRESHOLD = 48;

export default function GymBottomSheet({
  gyms,
  selectedGym,
  onSelectGym,
  onConsult,
  refreshing = false,
}: GymBottomSheetProps) {
  const [expanded, setExpanded] = useState(false);
  const dragStartY = useRef<number | null>(null);
  const didDragRef = useRef(false);

  const handlePointerDown = (clientY: number) => {
    dragStartY.current = clientY;
    didDragRef.current = false;
  };

  const handlePointerUp = (clientY: number) => {
    if (dragStartY.current == null) return;
    const delta = dragStartY.current - clientY;
    dragStartY.current = null;

    if (Math.abs(delta) < DRAG_THRESHOLD) return;
    didDragRef.current = true;
    setExpanded(delta > 0);
  };

  const handleHandleClick = () => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    setExpanded((prev) => !prev);
  };

  return (
    <section
      className={`gym-sheet${expanded ? ' is-expanded' : ' is-collapsed'}`}
      aria-label="주변 헬스장 바텀 시트"
    >
      <button
        type="button"
        className="gym-sheet-handle"
        aria-expanded={expanded}
        aria-label={expanded ? '시트 접기' : '시트 펼치기'}
        onClick={handleHandleClick}
        onTouchStart={(event) => handlePointerDown(event.touches[0]?.clientY ?? 0)}
        onTouchEnd={(event) => handlePointerUp(event.changedTouches[0]?.clientY ?? 0)}
        onMouseDown={(event) => handlePointerDown(event.clientY)}
        onMouseUp={(event) => handlePointerUp(event.clientY)}
      >
        <span className="gym-sheet-grabber" />
        <span className="gym-sheet-handle-label">
          {refreshing
            ? '주변 헬스장 업데이트 중…'
            : expanded
              ? '목록 접기'
              : `주변 추천 ${gyms.length}곳`}
        </span>
      </button>

      <div className="gym-sheet-body">
        {!expanded && selectedGym && (
          <article className="gym-summary">
            <GymThumbnail gym={selectedGym} size="md" />
            <div className="gym-summary-body">
              <div className="gym-summary-top">
                <span className="status-badge badge-red">{selectedGym.type}</span>
                {isNaverSourcedGym(selectedGym) && (
                  <span className="gym-source-badge gym-source-badge-sm">네이버</span>
                )}
                <span className="gym-distance">
                  {selectedGym.distanceKm.toFixed(1)}km
                </span>
              </div>
              <h2>{selectedGym.name}</h2>
              <div className="gym-card-meta">
                {hasGymRating(selectedGym) && (
                  <span>
                    <Star size={14} />
                    {selectedGym.rating.toFixed(1)}
                  </span>
                )}
                <span>
                  <MapPin size={14} />
                  {selectedGym.address}
                </span>
              </div>
              <div className="gym-tags">
                {selectedGym.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="gym-tag">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="gym-summary-actions">
                <Link
                  to={`/user/gym/${selectedGym.id}`}
                  className="btn btn-primary gym-summary-cta"
                >
                  상세보기
                </Link>
                {hasNaverExternalLink(selectedGym) ? (
                  <a
                    href={selectedGym.externalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary gym-summary-cta"
                  >
                    <ExternalLink size={14} />
                    네이버
                  </a>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary gym-summary-cta"
                    onClick={onConsult}
                  >
                    상담 신청
                  </button>
                )}
              </div>
            </div>
          </article>
        )}

        {expanded && (
          <ul className="gym-sheet-list">
            {gyms.map((gym) => {
              const active = gym.id === selectedGym?.id;
              return (
                <li key={gym.id}>
                  <button
                    type="button"
                    className={`gym-sheet-item${active ? ' is-active' : ''}`}
                    onClick={() => onSelectGym(gym.id)}
                  >
                    <GymThumbnail gym={gym} size="sm" />
                    <div className="gym-sheet-item-body">
                      <div className="gym-summary-top">
                        <strong>{gym.name}</strong>
                        <span className="gym-distance">
                          {gym.distanceKm.toFixed(1)}km
                        </span>
                      </div>
                      <p>
                        {gym.type} · ★ {gym.rating.toFixed(1)}
                      </p>
                      <span className="gym-sheet-item-address">{gym.address}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
