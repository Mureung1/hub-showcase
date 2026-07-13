import { create } from "zustand";
import { IMMINENT_DAYS } from "../lib/date";

// 임박 기준(D-day). 화면(입고 뱃지·재고 필터·캘린더)이 공유하는 앱 전역 클라이언트 상태(§6 → Zustand).
// 유통기한 캘린더의 [3][5][7] 세그먼트가 이 값을 바꾸면 세 화면의 임박 판정이 함께 움직인다.
interface ThresholdState {
  threshDays: number;
  setThreshDays: (days: number) => void;
}

export const useThresholdStore = create<ThresholdState>((set) => ({
  threshDays: IMMINENT_DAYS,
  setThreshDays: (days) => set({ threshDays: days }),
}));
