import type { MenuCategory, MenuItem } from "../types/menu.js";
import type { Platform, PlatformConnection } from "../types/platform.js";
import type { Store } from "../types/store.js";

/**
 * CLAUDE.md 컨벤션: 예시 데이터는 항상 "카페 하루" 세트를 재사용한다.
 * 서버 프로세스 메모리에만 존재하며, 재시작 시 아래 초기값으로 리셋된다.
 */
const store: Store = {
  id: "store-cafe-haru",
  name: "카페 하루",
  businessHours: [
    { dayOfWeek: "mon", isOpen: true, openTime: "09:00", closeTime: "21:00", breakStartTime: null, breakEndTime: null, lastOrderTime: "20:30" },
    { dayOfWeek: "tue", isOpen: true, openTime: "09:00", closeTime: "21:00", breakStartTime: null, breakEndTime: null, lastOrderTime: "20:30" },
    { dayOfWeek: "wed", isOpen: true, openTime: "09:00", closeTime: "21:00", breakStartTime: null, breakEndTime: null, lastOrderTime: "20:30" },
    { dayOfWeek: "thu", isOpen: true, openTime: "09:00", closeTime: "21:00", breakStartTime: null, breakEndTime: null, lastOrderTime: "20:30" },
    { dayOfWeek: "fri", isOpen: true, openTime: "09:00", closeTime: "22:00", breakStartTime: null, breakEndTime: null, lastOrderTime: "21:30" },
    { dayOfWeek: "sat", isOpen: true, openTime: "10:00", closeTime: "22:00", breakStartTime: null, breakEndTime: null, lastOrderTime: "21:30" },
    { dayOfWeek: "sun", isOpen: false, openTime: null, closeTime: null, breakStartTime: null, breakEndTime: null, lastOrderTime: null },
  ],
  regularHolidays: [{ dayOfWeek: "sun" }],
  temporaryHolidays: [],
};

const menuCategories: MenuCategory[] = [
  { id: "category-drink", name: "음료", order: 1 },
  { id: "category-dessert", name: "디저트", order: 2 },
];

const menuItems: MenuItem[] = [
  { id: "menu-americano", categoryId: "category-drink", name: "아메리카노", description: "깔끔한 원두 향의 기본 아메리카노", basePrice: 4500, isSelling: true },
  { id: "menu-cafelatte", categoryId: "category-drink", name: "카페라테", description: "부드러운 우유 거품의 카페라테", basePrice: 5000, isSelling: true },
  { id: "menu-cheesecake", categoryId: "category-dessert", name: "치즈케이크", description: "진한 크림치즈 케이크 한 조각", basePrice: 6500, isSelling: true },
];

const platforms: Platform[] = [
  { id: "naver", name: "네이버 플레이스", supportsAutoUpdate: true, editUrl: "https://new.smartplace.naver.com" },
  { id: "kakao", name: "카카오맵", supportsAutoUpdate: true, editUrl: "https://biz.kakaomap.com" },
  { id: "delivery", name: "배달앱", supportsAutoUpdate: false, editUrl: "https://self.baemin.com" },
];

const platformConnections: PlatformConnection[] = [
  { platformId: "naver", status: "connected", connectedAt: "2026-06-01T09:00:00.000Z", expiresAt: null },
  { platformId: "kakao", status: "connected", connectedAt: "2026-06-01T09:00:00.000Z", expiresAt: null },
  { platformId: "delivery", status: "reconnect_required", connectedAt: "2026-04-10T09:00:00.000Z", expiresAt: "2026-07-01T00:00:00.000Z" },
];

export const storeRepository = {
  getStore(): Store {
    return store;
  },
  getMenuCategories(): MenuCategory[] {
    return menuCategories;
  },
  getMenuItems(): MenuItem[] {
    return menuItems;
  },
  getPlatforms(): Platform[] {
    return platforms;
  },
  getPlatformConnections(): PlatformConnection[] {
    return platformConnections;
  },
};
