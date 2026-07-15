import { create } from 'zustand';
import { DEFAULT_USER_LOCATION, DEFAULT_USER_LOCATION_LABEL } from '../data/bakeries.js';

// 전역 상태. CLAUDE.md 3번 결정사항(zustand) 반영.
// 로그인/빵집 선택/찜/필터/모달/토스트 등 화면 간에 공유되는 상태를 여기서 관리한다.
// TODO: user/savedCourses는 서버 연동(3주차) 시 api/auth.js, api/routes.js 호출로 교체.
export const useAppStore = create((set, get) => ({
  // ----- 사용자 위치(경로 출발점 고정에 사용) -----
  userLocation: DEFAULT_USER_LOCATION,
  userLocationLabel: DEFAULT_USER_LOCATION_LABEL,
  setUserLocation: (loc, label) => set({ userLocation: loc, userLocationLabel: label }),

  // ----- 선택(지도/리스트 → 경로 계산) -----
  selectedIds: new Set(),
  toggleSelect: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      next.has(id) ? next.delete(id) : next.add(id);
      return { selectedIds: next };
    }),
  removeFromSelection: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      next.delete(id);
      return { selectedIds: next };
    }),
  clearSelection: () => set({ selectedIds: new Set() }),
  setSelectedIds: (ids) => set({ selectedIds: new Set(ids) }),

  // ----- 찜하기 -----
  wishlist: new Set(),
  toggleWishlist: (id) =>
    set((state) => {
      const next = new Set(state.wishlist);
      next.has(id) ? next.delete(id) : next.add(id);
      return { wishlist: next };
    }),

  // ----- 인증 -----
  user: null,
  authModal: null, // null | 'login' | 'signup'
  openAuthModal: (mode) => set({ authModal: mode }),
  closeAuthModal: () => set({ authModal: null }),
  login: (payload) =>
    set({
      user: { taste: [], visited: [], wishlist: [], ...payload },
      authModal: null,
    }),
  logout: () => set({ user: null }),

  // ----- 경로 결과(선택 순위) -----
  activeRankIdx: 0,
  setActiveRankIdx: (idx) => set({ activeRankIdx: idx }),

  // ----- 저장한 코스(마이페이지) -----
  savedCourses: [],
  saveCourse: (course) => set((state) => ({ savedCourses: [...state.savedCourses, course] })),

  // ----- 리스트 화면 검색/필터 -----
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
  listFilters: { categories: new Set(), price: 0, openOnly: false, sort: 'name' },
  toggleCategoryFilter: (cat) =>
    set((state) => {
      const next = new Set(state.listFilters.categories);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return { listFilters: { ...state.listFilters, categories: next } };
    }),
  setPriceFilter: (price) => set((state) => ({ listFilters: { ...state.listFilters, price } })),
  setOpenOnly: (openOnly) => set((state) => ({ listFilters: { ...state.listFilters, openOnly } })),
  setSort: (sort) => set((state) => ({ listFilters: { ...state.listFilters, sort } })),

  // ----- 테마 -----
  theme: typeof window !== 'undefined' && localStorage.getItem('theme') === 'dark' ? 'dark' : 'light',
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') localStorage.setItem('theme', next);
      return { theme: next };
    }),

  // ----- 토스트 -----
  toast: null,
  showToast: (message) => {
    set({ toast: message });
    clearTimeout(get()._toastTimer);
    const timer = setTimeout(() => set({ toast: null }), 2200);
    set({ _toastTimer: timer });
  },
}));
