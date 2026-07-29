import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore.js';
import { matchesSearch } from '../utils/search.js';
import { isOpenNow } from '../utils/bakeryStatus.js';
import { haversineDistanceKm } from '../utils/geo.js';
import { BREAD_CATEGORIES } from '../data/breadCategories.js';
import { PRICE_LABELS } from '../data/mockBakeryExtras.js';
import BakeryCard from '../components/BakeryCard.jsx';
import { SearchIcon } from '../components/icons.jsx';

const PRICE_TIERS = [1, 2, 3];

export default function ListScreen() {
  const bakeries = useAppStore((s) => s.bakeries);
  const bakeriesStatus = useAppStore((s) => s.bakeriesStatus);
  const selectedIds = useAppStore((s) => s.selectedIds);
  const toggleSelect = useAppStore((s) => s.toggleSelect);
  const wishlist = useAppStore((s) => s.wishlist);
  const toggleWishlist = useAppStore((s) => s.toggleWishlist);
  const visited = useAppStore((s) => s.visited);
  const toggleVisited = useAppStore((s) => s.toggleVisited);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const listFilters = useAppStore((s) => s.listFilters);
  const setOpenOnly = useAppStore((s) => s.setOpenOnly);
  const setSort = useAppStore((s) => s.setSort);
  const toggleCategoryFilter = useAppStore((s) => s.toggleCategoryFilter);
  const setPriceTier = useAppStore((s) => s.setPriceTier);
  const userLocation = useAppStore((s) => s.userLocation);

  const list = useMemo(() => {
    let filtered = bakeries.filter((b) => {
      if (listFilters.openOnly && !isOpenNow(b)) return false;
      if (listFilters.categories.length && !listFilters.categories.some((c) => b.category?.includes(c))) return false;
      if (listFilters.priceTier && b.priceTier !== listFilters.priceTier) return false;
      if (!matchesSearch(b, searchQuery)) return false;
      return true;
    });
    if (listFilters.sort === 'near') {
      filtered = [...filtered].sort(
        (a, b) => haversineDistanceKm(a, userLocation) - haversineDistanceKm(b, userLocation)
      );
    } else if (listFilters.sort === 'wishlist') {
      filtered = [...filtered].sort((a, b) => (wishlist.has(b.id) ? 1 : 0) - (wishlist.has(a.id) ? 1 : 0));
    } else {
      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    }
    return filtered;
  }, [bakeries, listFilters, searchQuery, wishlist, userLocation]);

  return (
    <section className="screen-list">
      <div className="list-toolbar">
        <div className="section-title">대전 베이커리 목록</div>
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
        <div className="sort-wrap">
          <label htmlFor="sort-select">정렬</label>
          <select id="sort-select" value={listFilters.sort} onChange={(e) => setSort(e.target.value)}>
            <option value="name">이름순</option>
            <option value="near">내 주변 가까운 순</option>
            <option value="wishlist">찜 많은 순</option>
          </select>
        </div>
      </div>

      <div className="filter-bar">
        <div className="mode-tabs wrap">
          {BREAD_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={`mode-tab${listFilters.categories.includes(c) ? ' active' : ''}`}
              onClick={() => toggleCategoryFilter(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="mode-tabs">
          {PRICE_TIERS.map((tier) => (
            <button
              key={tier}
              type="button"
              className={`mode-tab${listFilters.priceTier === tier ? ' active' : ''}`}
              onClick={() => setPriceTier(tier)}
            >
              {PRICE_LABELS[tier]}
            </button>
          ))}
        </div>
        <label className="open-toggle">
          <input type="checkbox" checked={listFilters.openOnly} onChange={(e) => setOpenOnly(e.target.checked)} />
          <span>지금 영업중만</span>
        </label>
      </div>

      <div className="list-grid">
        {bakeriesStatus === 'loading' && <div className="list-empty">빵집 목록을 불러오는 중이에요...</div>}
        {bakeriesStatus === 'error' && <div className="list-empty">목록을 불러오지 못했어요. 새로고침해주세요.</div>}
        {bakeriesStatus === 'ready' &&
          (list.length === 0 ? (
            <div className="list-empty">조건에 맞는 빵집이 없어요.</div>
          ) : (
            <AnimatePresence initial={false}>
              {list.map((b) => (
                <motion.div
                  key={b.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.18 }}
                >
                  <BakeryCard
                    bakery={b}
                    selected={selectedIds.has(b.id)}
                    liked={wishlist.has(b.id)}
                    visited={visited.has(b.id)}
                    onToggleSelect={() => toggleSelect(b.id)}
                    onToggleWishlist={() => toggleWishlist(b.id)}
                    onToggleVisited={() => toggleVisited(b.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          ))}
      </div>
    </section>
  );
}
