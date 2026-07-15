import { useMemo } from 'react';
import { bakeries, allCategories } from '../data/bakeries.js';
import { useAppStore } from '../store/useAppStore.js';
import { matchesSearch } from '../utils/search.js';
import { isOpenNow } from '../utils/bakeryStatus.js';
import { haversineDistanceKm } from '../utils/geo.js';
import BakeryCard from '../components/BakeryCard.jsx';

// TODO(2~3주차): GET /api/bakeries 연동 시 bakeries.js의 mock 배열을 서버 응답으로 교체.
export default function ListScreen() {
  const selectedIds = useAppStore((s) => s.selectedIds);
  const toggleSelect = useAppStore((s) => s.toggleSelect);
  const wishlist = useAppStore((s) => s.wishlist);
  const toggleWishlist = useAppStore((s) => s.toggleWishlist);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const listFilters = useAppStore((s) => s.listFilters);
  const toggleCategoryFilter = useAppStore((s) => s.toggleCategoryFilter);
  const setPriceFilter = useAppStore((s) => s.setPriceFilter);
  const setOpenOnly = useAppStore((s) => s.setOpenOnly);
  const setSort = useAppStore((s) => s.setSort);
  const userLocation = useAppStore((s) => s.userLocation);

  const list = useMemo(() => {
    let filtered = bakeries.filter((b) => {
      if (listFilters.categories.size && !b.category.some((c) => listFilters.categories.has(c))) return false;
      if (listFilters.price && b.price !== listFilters.price) return false;
      if (listFilters.openOnly && !isOpenNow(b)) return false;
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
  }, [listFilters, searchQuery, wishlist, userLocation]);

  return (
    <section className="screen-list">
      <div className="list-toolbar">
        <div className="section-title">대전 베이커리 목록</div>
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
        <div className="filter-chips">
          {allCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`filter-chip${listFilters.categories.has(cat) ? ' active' : ''}`}
              onClick={() => toggleCategoryFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="filter-group">
          {[
            [0, '전체'],
            [1, '저'],
            [2, '중'],
            [3, '고'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={listFilters.price === value ? 'active' : ''}
              onClick={() => setPriceFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="open-toggle">
          <input type="checkbox" checked={listFilters.openOnly} onChange={(e) => setOpenOnly(e.target.checked)} />
          <span>지금 영업중만</span>
        </label>
      </div>

      <div className="list-grid">
        {list.length === 0 ? (
          <div className="list-empty">조건에 맞는 빵집이 없어요.</div>
        ) : (
          list.map((b) => (
            <BakeryCard
              key={b.id}
              bakery={b}
              selected={selectedIds.has(b.id)}
              liked={wishlist.has(b.id)}
              onToggleSelect={() => toggleSelect(b.id)}
              onToggleWishlist={() => toggleWishlist(b.id)}
            />
          ))
        )}
      </div>
    </section>
  );
}
