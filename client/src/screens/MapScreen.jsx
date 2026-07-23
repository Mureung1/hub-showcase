import { useCallback, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore.js';
import { requestCurrentLocation } from '../utils/geolocation.js';
import { haversineDistanceKm } from '../utils/geo.js';
import NaverMapCanvas from '../components/NaverMapCanvas.jsx';
import SelectionCard from '../components/SelectionCard.jsx';
import Mascot from '../components/Mascot.jsx';
import { LocateIcon } from '../components/icons.jsx';

export default function MapScreen() {
  const navigate = useNavigate();
  const bakeries = useAppStore((s) => s.bakeries);
  const selectedIds = useAppStore((s) => s.selectedIds);
  const toggleSelect = useAppStore((s) => s.toggleSelect);
  const removeFromSelection = useAppStore((s) => s.removeFromSelection);
  const wishlist = useAppStore((s) => s.wishlist);
  const toggleWishlist = useAppStore((s) => s.toggleWishlist);
  const visited = useAppStore((s) => s.visited);
  const toggleVisited = useAppStore((s) => s.toggleVisited);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const userLocation = useAppStore((s) => s.userLocation);
  const userLocationLabel = useAppStore((s) => s.userLocationLabel);
  const setUserLocation = useAppStore((s) => s.setUserLocation);
  const showToast = useAppStore((s) => s.showToast);

  const [locating, setLocating] = useState(false);

  const selected = [...selectedIds].map((id) => bakeries.find((b) => b.id === id));

  const handleLocate = async () => {
    setLocating(true);
    try {
      const loc = await requestCurrentLocation();
      setUserLocation(loc, '내 위치');
      showToast('현재 위치로 출발지를 설정했어요');
    } catch {
      showToast('위치를 가져오지 못했어요. 지도를 클릭해서 직접 설정해주세요');
    } finally {
      setLocating(false);
    }
  };

  // NaverMapCanvas의 지도 클릭 리스너는 마운트 시 한 번만 붙으므로 ref로 최신 콜백을 참조한다.
  // 여기서는 그냥 안정적인 참조를 넘기기 위해 useCallback으로 감싼다(store 액션 자체는 이미 안정적).
  const handleMapClick = useCallback(
    (loc) => {
      setUserLocation(loc, '지도에서 선택한 위치');
      showToast('출발지를 변경했어요');
    },
    [setUserLocation, showToast]
  );

  return (
    <section className="screen-map">
      <div className="map-canvas">
        <NaverMapCanvas
          bakeries={bakeries}
          selectedIds={selectedIds}
          searchQuery={searchQuery}
          onToggleSelect={toggleSelect}
          userLocation={userLocation}
          userLocationLabel={userLocationLabel}
          onMapClick={handleMapClick}
        />
        <div className="map-hint">
          <Mascot variant="pointing" />
          마커를 눌러 빵집을 살펴보세요
        </div>
        <div className="location-bar">
          <span className="location-label">
            <LocateIcon />
            출발지: {userLocationLabel}
          </span>
          <button type="button" className="location-btn" onClick={handleLocate} disabled={locating}>
            {locating ? '찾는 중…' : '현재 위치 사용'}
          </button>
        </div>

        <Link to="/recommend" className="recommend-cta">
          <span className="recommend-cta-circle">
            <img src="/recomm.png" alt="" />
          </span>
          <span className="recommend-cta-label">자동 추천 받기</span>
        </Link>
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
                  visited={visited.has(b.id)}
                  distanceKm={haversineDistanceKm(userLocation, b)}
                  onRemove={() => removeFromSelection(b.id)}
                  onToggleWishlist={() => toggleWishlist(b.id)}
                  onToggleVisited={() => toggleVisited(b.id)}
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
