import { create } from 'zustand';
import { DEFAULT_USER_LOCATION, DEFAULT_USER_LOCATION_LABEL } from '../data/mapDefaults.js';
import { fetchBakeries } from '../api/bakeries.js';
import { fetchMe, toggleBakeryStatus as toggleBakeryStatusApi } from '../api/users.js';

// 전역 상태. CLAUDE.md 3번 결정사항(zustand) 반영.
// 로그인/빵집 선택/찜/필터/모달/토스트 등 화면 간에 공유되는 상태를 여기서 관리한다.
// TODO: savedCourses는 서버 연동(추후) 시 코스 저장 API로 교체.
export const useAppStore = create((set, get) => ({
  // ----- 빵집 목록(서버 실데이터) -----
  bakeries: [],
  bakeriesStatus: 'idle', // idle | loading | ready | error
  loadBakeries: async () => {
    set({ bakeriesStatus: 'loading' });
    try {
      const bakeries = await fetchBakeries();
      set({ bakeries, bakeriesStatus: 'ready' });
    } catch {
      set({ bakeriesStatus: 'error' });
    }
  },

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

  // ----- 자동 추천받기 -----
  // 추천 결과(빵집+동선)는 RouteScreen이 마운트 시 한 번만 꺼내 쓰고 비우는 1회성 값이다.
  // 그래야 이후 사용자가 트레이에서 빵집을 빼는 등 직접 조작하면 자연스럽게 평소 재계산 흐름으로 넘어간다.
  pendingRecommendation: null, // { routes, mode } | null
  applyRecommendation: ({ bakeries, routes, mode }) =>
    set((state) => {
      const existingIds = new Set(state.bakeries.map((b) => b.id));
      const merged = [...state.bakeries, ...bakeries.filter((b) => !existingIds.has(b.id))];
      return {
        bakeries: merged,
        selectedIds: new Set(bakeries.map((b) => b.id)),
        pendingRecommendation: { routes, mode },
      };
    }),
  consumePendingRecommendation: () => {
    const pending = get().pendingRecommendation;
    if (pending) set({ pendingRecommendation: null });
    return pending;
  },

  // ----- 찜하기 / 가본 곳 -----
  // 로그인 여부와 무관하게 로컬에서는 항상 즉시 토글되고(비로그인도 눌러볼 수 있게), 로그인 상태면
  // 그 위에 서버 저장을 얹는다 — 실패해도 화면은 이미 반응한 뒤라 토스트로만 알린다(낙관적 업데이트).
  wishlist: new Set(),
  visited: new Set(),
  toggleWishlist: (id) => get()._toggleBakeryFlag('wishlist', id),
  toggleVisited: (id) => get()._toggleBakeryFlag('visited', id),
  _toggleBakeryFlag: (status, id) => {
    const key = status; // 'wishlist' | 'visited'
    set((state) => {
      const next = new Set(state[key]);
      next.has(id) ? next.delete(id) : next.add(id);
      return { [key]: next };
    });
    if (get().user) {
      toggleBakeryStatusApi(id, status).catch(() => {
        get().showToast('저장에 실패했어요. 다시 시도해주세요.');
      });
    }
  },

  // ----- 인증 -----
  user: null,
  authStatus: 'idle', // idle | loading | ready — 'ready'가 돼야 로그인 여부가 확정된 것
  authModal: null, // null | 'login' | 'signup'
  openAuthModal: (mode) => set({ authModal: mode }),
  closeAuthModal: () => set({ authModal: null }),
  // 로그인/회원가입 성공 직후, 그리고 앱 시작 시 토큰이 남아있을 때 둘 다 이걸로 프로필을 채운다.
  restoreSession: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ authStatus: 'ready' });
      return;
    }
    set({ authStatus: 'loading' });
    try {
      const me = await fetchMe();
      set({
        user: { id: me.id, taste: me.taste },
        wishlist: new Set(me.wishlist),
        visited: new Set(me.visited),
        authStatus: 'ready',
      });
    } catch {
      localStorage.removeItem('token');
      set({ user: null, authStatus: 'ready' });
    }
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, wishlist: new Set(), visited: new Set() });
  },

  // ----- 경로 결과(선택 순위) -----
  activeRankIdx: 0,
  setActiveRankIdx: (idx) => set({ activeRankIdx: idx }),

  // ----- 저장한 코스(마이페이지) -----
  savedCourses: [],
  saveCourse: (course) => set((state) => ({ savedCourses: [...state.savedCourses, course] })),

  // ----- 리스트 화면 검색/필터 -----
  // 카테고리/가격대 필터는 뺐다 — 실제 빵집 데이터엔 그 필드가 없어서(수집 항목에 없음) 필터를 걸어도
  // 아무것도 안 걸러지는 눈속임 UI가 되기 때문. 데이터에 해당 필드가 생기면 그때 다시 추가.
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
  listFilters: { openOnly: false, sort: 'name' },
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
