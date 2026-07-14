import { useNavigate } from 'react-router-dom';
import { bakeries } from '../data/bakeries.js';
import { useAppStore } from '../store/useAppStore.js';
import NaverMapCanvas from '../components/NaverMapCanvas.jsx';
import SelectionCard from '../components/SelectionCard.jsx';
import Mascot from '../components/Mascot.jsx';

export default function MapScreen() {
  const navigate = useNavigate();
  const selectedIds = useAppStore((s) => s.selectedIds);
  const toggleSelect = useAppStore((s) => s.toggleSelect);
  const removeFromSelection = useAppStore((s) => s.removeFromSelection);
  const wishlist = useAppStore((s) => s.wishlist);
  const toggleWishlist = useAppStore((s) => s.toggleWishlist);
  const searchQuery = useAppStore((s) => s.searchQuery);

  const selected = [...selectedIds].map((id) => bakeries.find((b) => b.id === id));

  return (
    <section className="screen-map">
      <div className="map-canvas">
        <NaverMapCanvas
          bakeries={bakeries}
          selectedIds={selectedIds}
          searchQuery={searchQuery}
          onToggleSelect={toggleSelect}
        />
        <div className="map-hint">
          <Mascot variant="pointing" />
          마커를 눌러 빵집을 살펴보세요
        </div>
      </div>

      <div className="detail-panel">
        {selected.length === 0 ? (
          <div className="empty">
            <Mascot />
            <p>
              지도에서 빵집을 클릭하면
              <br />
              상세 정보가 여기 표시돼요.
            </p>
          </div>
        ) : (
          <>
            <div className="selection-summary">
              <span className="count-label">선택한 빵집 {selected.length}곳</span>
              {selected.length < 2 && <span className="select-hint">2곳 이상 선택해주세요</span>}
            </div>
            <div className="detail-panel-body">
              {selected.map((b) => (
                <SelectionCard
                  key={b.id}
                  bakery={b}
                  liked={wishlist.has(b.id)}
                  onRemove={() => removeFromSelection(b.id)}
                  onToggleWishlist={() => toggleWishlist(b.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        className={`tray${selectedIds.size > 0 ? ' show' : ''}`}
        disabled={selectedIds.size < 2}
        onClick={() => selectedIds.size >= 2 && navigate('/route')}
      >
        <span>선택함</span>
        <span className="count">{selectedIds.size}</span>
      </button>
    </section>
  );
}
