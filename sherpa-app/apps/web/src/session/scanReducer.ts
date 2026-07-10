import { newId, type Product } from "@sherpa/core";
import type { ScanLine, SessionMode } from "./types";

// 세션 상태: lines[]가 진짜 상태. mode는 세션당 하나, lastLineId는 "가장 최근에
// 건드린 line"(UI 강조용).
export interface ScanState {
  mode: SessionMode;
  lines: ScanLine[];
  lastLineId: string | null;
}

export type ScanAction =
  | { type: "SET_MODE"; mode: SessionMode }
  | { type: "SCAN_KNOWN"; product: Product }
  | { type: "INC"; lineId: string }
  | { type: "DEC"; lineId: string };

export const initialScanState: ScanState = {
  mode: "inbound",
  lines: [],
  lastLineId: null,
};

// 순수 함수 — 모든 변형이 lines[] 하나를 규칙대로 바꾼다.
export function scanReducer(state: ScanState, action: ScanAction): ScanState {
  switch (action.type) {
    // 모드 전환 = 새 세션 시작 → 현재 세션 lines 리셋(입고/출고 항목이 섞이지 않게).
    case "SET_MODE":
      return { mode: action.mode, lines: [], lastLineId: null };

    case "SCAN_KNOWN": {
      const { product } = action;
      const existing = state.lines.find((l) => l.barcode === product.barcode);
      if (existing) {
        // 같은 상품 재스캔 → 기존 line quantity+1, 최근 항목으로 맨 위 이동.
        const updated: ScanLine = { ...existing, quantity: existing.quantity + 1 };
        const rest = state.lines.filter((l) => l.id !== existing.id);
        return { ...state, lines: [updated, ...rest], lastLineId: updated.id };
      }
      // 새 상품 → 새 ready line append(맨 위).
      const line: ScanLine = {
        id: newId(),
        barcode: product.barcode,
        productName: product.name,
        category: product.category,
        quantity: 1,
        status: "ready",
      };
      return { ...state, lines: [line, ...state.lines], lastLineId: line.id };
    }

    case "INC":
      return {
        ...state,
        lines: state.lines.map((l) =>
          l.id === action.lineId ? { ...l, quantity: l.quantity + 1 } : l
        ),
        lastLineId: action.lineId,
      };

    case "DEC":
      // 순수 수량 조절, 최소 1 (0/삭제는 S5).
      return {
        ...state,
        lines: state.lines.map((l) =>
          l.id === action.lineId
            ? { ...l, quantity: Math.max(1, l.quantity - 1) }
            : l
        ),
        lastLineId: action.lineId,
      };

    default:
      return state;
  }
}
