import { newId, type Product } from "@sherpa/core";
import { addDaysISO, todayISO } from "../lib/date";
import type { ScanLine, SessionMode } from "./types";

// 입고 라인의 기본 유통기한 = 오늘+7일. 출고 라인은 FEFO라 유통기한을 두지 않는다("").
function defaultExpiry(mode: SessionMode): string {
  return mode === "inbound" ? addDaysISO(todayISO(), 7) : "";
}

// 세션 상태: lines[]가 진짜 상태. mode는 세션당 하나, lastLineId는 "가장 최근에
// 건드린 line"(UI 강조용), editingLineId는 등록 모달이 편집 중인 pending 행(없으면 null).
export interface ScanState {
  mode: SessionMode;
  lines: ScanLine[];
  lastLineId: string | null;
  editingLineId: string | null;
}

export type ScanAction =
  | { type: "SET_MODE"; mode: SessionMode }
  | { type: "SCAN_KNOWN"; product: Product }
  | { type: "SCAN_UNKNOWN"; barcode: string }
  | { type: "PROMOTE"; lineId: string; productId: string; name: string; category: string }
  | { type: "OPEN_EDIT"; lineId: string }
  | { type: "CLOSE_EDIT" }
  | { type: "REMOVE_LINE"; lineId: string }
  | { type: "RESET_SESSION" }
  | { type: "SET_EXPIRY"; lineId: string; expiry: string }
  | { type: "INC"; lineId: string }
  | { type: "DEC"; lineId: string };

export const initialScanState: ScanState = {
  mode: "inbound",
  lines: [],
  lastLineId: null,
  editingLineId: null,
};

// 순수 함수 — 모든 변형이 lines[] 하나를 규칙대로 바꾼다.
export function scanReducer(state: ScanState, action: ScanAction): ScanState {
  switch (action.type) {
    // 모드 전환 = 새 세션 시작 → 현재 세션 lines·편집 상태 리셋.
    case "SET_MODE":
      return { mode: action.mode, lines: [], lastLineId: null, editingLineId: null };

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
        productId: product.id,
        productName: product.name,
        category: product.category,
        quantity: 1,
        expiryDate: defaultExpiry(state.mode),
        status: "ready",
      };
      return { ...state, lines: [line, ...state.lines], lastLineId: line.id };
    }

    case "SCAN_UNKNOWN": {
      // 입고 세션에서만 디스패치됨(출고 미등록은 컴포넌트에서 경고 처리).
      const existing = state.lines.find(
        (l) => l.barcode === action.barcode && l.status === "pending"
      );
      if (existing) {
        // 같은 미등록 재스캔 → 수량+1, 그 행의 등록 모달 재오픈, 맨 위로.
        const updated: ScanLine = { ...existing, quantity: existing.quantity + 1 };
        const rest = state.lines.filter((l) => l.id !== existing.id);
        return {
          ...state,
          lines: [updated, ...rest],
          lastLineId: updated.id,
          editingLineId: updated.id,
        };
      }
      // 새 미등록 → pending 행 생성(맨 위) + 모달을 이 행에 연결.
      // 이전에 편집하던 pending 행(A)은 리스트에 그대로 남는다(절대 증발 금지).
      const line: ScanLine = {
        id: newId(),
        barcode: action.barcode,
        productId: "", // 등록 승격 시 채워짐
        productName: "",
        category: "",
        quantity: 1,
        expiryDate: defaultExpiry(state.mode),
        status: "pending",
      };
      return {
        ...state,
        lines: [line, ...state.lines],
        lastLineId: line.id,
        editingLineId: line.id,
      };
    }

    // 모달 저장 → 해당 pending 행을 ready로 승격(이미 리스트에 있으므로 자동 반영) + 모달 닫기.
    case "PROMOTE":
      return {
        ...state,
        editingLineId: null,
        lastLineId: action.lineId,
        lines: state.lines.map((l) =>
          l.id === action.lineId
            ? {
                ...l,
                status: "ready",
                productId: action.productId,
                productName: action.name,
                category: action.category,
              }
            : l
        ),
      };

    // 리스트의 pending 행 탭 → 그 행의 등록 모달 재오픈(밀려났던 항목 회수).
    case "OPEN_EDIT":
      return { ...state, editingLineId: action.lineId };

    // 모달 취소 → 편집만 닫음. pending 행은 리스트에 그대로 남는다.
    case "CLOSE_EDIT":
      return { ...state, editingLineId: null };

    // 오스캔 취소 → 행 명시적 삭제(잘못 찍은 미등록 제거, 교착 방지). pending 소멸의
    // 두 경로(등록 승격 / 명시적 삭제) 중 하나 — 조용히 사라지는 일이 없게 이것만 연다.
    case "REMOVE_LINE":
      return {
        ...state,
        lines: state.lines.filter((l) => l.id !== action.lineId),
        editingLineId:
          state.editingLineId === action.lineId ? null : state.editingLineId,
        lastLineId: state.lastLineId === action.lineId ? null : state.lastLineId,
      };

    // 커밋 완료 → 세션 리셋(모드는 유지, 새 세션 시작).
    case "RESET_SESSION":
      return { ...state, lines: [], lastLineId: null, editingLineId: null };

    // 행 유통기한 변경(입고 라인의 date input). lastLineId는 건드리지 않는다
    // (날짜 조정은 '방금 스캔' 강조를 옮길 만한 사건이 아님).
    case "SET_EXPIRY":
      return {
        ...state,
        lines: state.lines.map((l) =>
          l.id === action.lineId ? { ...l, expiryDate: action.expiry } : l
        ),
      };

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
