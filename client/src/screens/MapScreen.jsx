import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore.js';
import { requestCurrentLocation } from '../utils/geolocation.js';
import { haversineDistanceKm } from '../utils/geo.js';
import { matchesSearch } from '../utils/search.js';
import { BREAD_CATEGORIES } from '../data/breadCategories.js';
import { PRICE_LABELS } from '../data/mockBakeryExtras.js';
import NaverMapCanvas from '../components/NaverMapCanvas.jsx';
import BakeryDetailPopup from '../components/BakeryDetailPopup.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import FeaturedBadge from '../components/FeaturedBadge.jsx';
import OperatorPicks from '../components/OperatorPicks.jsx';
import Mascot from '../components/Mascot.jsx';
import { LocateIcon, CloseIcon, SearchIcon, ChevronDownIcon } from '../components/icons.jsx';

const MAP_BAKERY_COUNT = 30;

export default function MapScreen() {
  const navigate = useNavigate();
  const bakeries = useAppStore((s) => s.bakeries);
  const bakeriesStatus = useAppStore((s) => s.bakeriesStatus);
  const selectedIds = useAppStore((s) => s.selectedIds);
  const toggleSelect = useAppStore((s) => s.toggleSelect);
  const removeFromSelection = useAppStore((s) => s.removeFromSelection);
  const wishlist = useAppStore((s) => s.wishlist);
  const toggleWishlist = useAppStore((s) => s.toggleWishlist);
  const visited = useAppStore((s) => s.visited);
  const toggleVisited = useAppStore((s) => s.toggleVisited);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const userLocation = useAppStore((s) => s.userLocation);
  const userLocationLabel = useAppStore((s) => s.userLocationLabel);
  const setUserLocation = useAppStore((s) => s.setUserLocation);
  const showToast = useAppStore((s) => s.showToast);
  const openRecommendModal = useAppStore((s) => s.openRecommendModal);

  const [locating, setLocating] = useState(false);
  // 마커 클릭(또는 좌측 리스트 항목 클릭)으로 뜨는 상세정보 박스 — 트레이는 이름만 보여주기로
  // 하면서 주소/대표메뉴 같은 상세 정보는 여기 팝업으로 옮겨왔다. detailPos는 NaverMapCanvas가
  // 계산해서 올려주는 화면 픽셀 좌표라, 마커 근처에 붙여 띄울 수 있다.
  const [detailId, setDetailId] = useState(null);
  const [detailPos, setDetailPos] = useState(null);
  // 마커가 너무 많아 안 보인다는 피드백 — 지도/좌측 리스트 모두 무작위 30곳만 보여주고,
  // 새로고침(=이 화면 재마운트)할 때마다 다시 뽑는다. 한 번 뽑은 뒤엔 리렌더/선택 변경에
  // 흔들리지 않도록 status가 ready로 바뀐 첫 순간에만 고정한다.
  const [visibleIds, setVisibleIds] = useState(null);
  // 카테고리 아코디언 — 한 번에 하나만 펼침
  const [expandedCategory, setExpandedCategory] = useState(null);

  useEffect(() => {
    if (bakeriesStatus !== 'ready' || visibleIds) return;
    // 운영자 추천은 무작위 표본에 밀려서 지도/리스트에서 빠지면 안 되니(캐러셀에서 눌러도 마커가
    // 없으면 상세 팝업이 안 뜬다) 항상 먼저 포함시키고, 나머지 자리를 무작위로 채운다.
    const featured = bakeries.filter((b) => b.isFeatured);
    const rest = [...bakeries.filter((b) => !b.isFeatured)].sort(() => Math.random() - 0.5);
    const combined = [...featured, ...rest].slice(0, MAP_BAKERY_COUNT);
    setVisibleIds(new Set(combined.map((b) => b.id)));
  }, [bakeriesStatus, bakeries, visibleIds]);

  const visibleBakeries = useMemo(
    () => (visibleIds ? bakeries.filter((b) => visibleIds.has(b.id)) : []),
    [bakeries, visibleIds]
  );
  const selected = [...selectedIds].map((id) => bakeries.find((b) => b.id === id));
  const detailBakery = bakeries.find((b) => b.id === detailId) || null;

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return visibleBakeries.filter((b) => matchesSearch(b, searchQuery));
  }, [visibleBakeries, searchQuery]);

  const categorized = useMemo(() => {
    const map = {};
    BREAD_CATEGORIES.forEach((c) => {
      map[c] = visibleBakeries.filter((b) => b.category?.includes(c));
    });
    return map;
  }, [visibleBakeries]);

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
  const handleMapInteraction = useCallback(() => {
    setDetailId(null);
    setDetailPos(null);
  }, []);
  const openDetail = (id) => setDetailId(id);

  return (
    <section className="screen-map">
      <aside className="browse-panel">
        <OperatorPicks bakeries={bakeries} onSelect={openDetail} />

        <div className="browse-panel-head">
          <div className="browse-panel-title">빵집 둘러보기</div>
          <label className="search">
            <SearchIcon />
            <input
              type="text"
              placeholder="빵집, 메뉴로 검색"
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>
        </div>

        <div className="browse-list">
          {bakeriesStatus === 'loading' && <div className="list-empty">불러오는 중이에요...</div>}
          {bakeriesStatus === 'error' && <div className="list-empty">목록을 불러오지 못했어요.</div>}
          {bakeriesStatus === 'ready' &&
            (searchResults ? (
              searchResults.length === 0 ? (
                <div className="list-empty">검색 결과가 없어요.</div>
              ) : (
                searchResults.map((b) => (
                  <BrowseItemRow
                    key={b.id}
                    bakery={b}
                    isSelected={selectedIds.has(b.id)}
                    isActive={detailId === b.id}
                    onOpen={() => openDetail(b.id)}
                    onToggle={() => toggleSelect(b.id)}
                  />
                ))
              )
            ) : (
              BREAD_CATEGORIES.map((cat) => (
                <div className="category-section" key={cat}>
                  <button
                    type="button"
                    className={`category-toggle${expandedCategory === cat ? ' open' : ''}`}
                    onClick={() => setExpandedCategory(expandedCategory === cat ? null : cat)}
                  >
                    <span>{cat}</span>
                    <span className="category-count">{categorized[cat].length}</span>
                    <span className={`category-chevron${expandedCategory === cat ? ' open' : ''}`}>
                      <ChevronDownIcon />
                    </span>
                  </button>
                  {expandedCategory === cat && (
                    <div className="category-items">
                      {categorized[cat].length === 0 ? (
                        <div className="list-empty small">해당 카테고리 빵집이 없어요.</div>
                      ) : (
                        categorized[cat].map((b) => (
                          <BrowseItemRow
                            key={b.id}
                            bakery={b}
                            isSelected={selectedIds.has(b.id)}
                            isActive={detailId === b.id}
                            onOpen={() => openDetail(b.id)}
                            onToggle={() => toggleSelect(b.id)}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))
            ))}
        </div>

        <button type="button" className="recommend-cta" onClick={openRecommendModal}>
          <img src="/recomm.png" alt="" className="recommend-cta-img" />
          <span className="recommend-cta-label">자동 추천 받기</span>
        </button>
      </aside>

      <div className="map-canvas">
        <NaverMapCanvas
          bakeries={visibleBakeries}
          selectedIds={selectedIds}
          searchQuery={searchQuery}
          onMarkerClick={openDetail}
          focusId={detailId}
          onFocusPosition={setDetailPos}
          onMapInteraction={handleMapInteraction}
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

        <AnimatePresence>
          {detailBakery && detailPos && (
            <motion.div
              key={detailBakery.id}
              className="map-detail-popup-wrap"
              style={{ left: detailPos.x, top: detailPos.y, x: '-50%', y: 'calc(-100% - 14px)' }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
              transition={{ duration: 0.2 }}
            >
              <BakeryDetailPopup
                bakery={detailBakery}
                selected={selectedIds.has(detailBakery.id)}
                liked={wishlist.has(detailBakery.id)}
                visited={visited.has(detailBakery.id)}
                distanceKm={haversineDistanceKm(userLocation, detailBakery)}
                onClose={() => {
                  setDetailId(null);
                  setDetailPos(null);
                }}
                onToggleSelect={() => toggleSelect(detailBakery.id)}
                onToggleWishlist={() => toggleWishlist(detailBakery.id)}
                onToggleVisited={() => toggleVisited(detailBakery.id)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <aside className="tray-panel">
        <div className="tray-panel-head">
          <h2>트레이</h2>
          <span className="count">{selected.length}</span>
        </div>
        {selected.length === 0 ? (
          <div className="tray-panel-empty">
            <Mascot />
            <p>
              지도나 리스트에서 담기를 누르면
              <br />
              여기에 담겨요.
            </p>
          </div>
        ) : (
          <div className="tray-panel-list">
            <AnimatePresence initial={false}>
              {selected.map((b) => (
                <motion.div
                  className="tray-panel-row"
                  key={b.id}
                  layout
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.15 }}
                >
                  <span>{b.name}</span>
                  <button type="button" aria-label={`${b.name} 선택 해제`} onClick={() => removeFromSelection(b.id)}>
                    <CloseIcon style={{ width: 11, height: 11 }} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
        {selected.length > 0 && selected.length < 2 && (
          <p className="select-hint">2곳 이상 선택해주세요</p>
        )}
        <button
          type="button"
          className="btn-solid tray-panel-cta"
          disabled={selected.length < 2}
          onClick={() => navigate('/route')}
        >
          코스 만들기{selected.length >= 2 ? ` (${selected.length})` : ''}
        </button>
      </aside>
    </section>
  );
}

function BrowseItemRow({ bakery, isSelected, isActive, onOpen, onToggle }) {
  return (
    <div className={`browse-item${isSelected ? ' selected' : ''}${isActive ? ' active' : ''}`} onClick={onOpen}>
      <div className="browse-item-main">
        <span className="browse-item-name">
          <span className="popup-name">{bakery.name}</span>
          {bakery.isFeatured && <FeaturedBadge comment={bakery.comment} />}
          <StatusBadge bakery={bakery} tag="status-chip" />
        </span>
        <div className="browse-item-tags">
          {bakery.category?.map((c) => (
            <span className="tag" key={c}>
              {c}
            </span>
          ))}
          {bakery.priceTier && <span className="tag price">{PRICE_LABELS[bakery.priceTier]}</span>}
        </div>
      </div>
      <button
        type="button"
        className={`browse-item-select${isSelected ? ' selected' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        {isSelected ? '담음' : '담기'}
      </button>
    </div>
  );
}
