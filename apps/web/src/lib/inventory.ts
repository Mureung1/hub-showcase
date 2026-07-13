import type { Lot, Product } from "@sherpa/core";
import { dDay, expiryStatus, type ExpiryStatus } from "./date";

// 재고 부족 판정 임계치. Product에 per-product min이 없어 전역 상수로 시작한다(스키마 변경 지양).
// 이 값 이하이면 '재고 부족'. 상품별 최소치는 후속 과제.
export const LOW_STOCK_THRESHOLD = 5;

// 재고/유통기한 화면이 읽는 파생 행. 재고 수량·가까운 유통기한은 Lot에서 계산한다(§3 원장 그대로).
export interface InventoryRow {
  product: Product;
  /** 이 상품 Lot 수량의 합 = 총 재고(파생값). */
  stock: number;
  /** 가장 이른 유통기한(문자열 사전순=날짜순). Lot이 없으면 null. */
  nearestExpiry: string | null;
  /** nearestExpiry의 D-day. Lot 없으면 null. */
  dday: number | null;
  /** 재고 부족 여부. */
  low: boolean;
  /** 가까운 유통기한의 임박/지남 상태(임박 기준 반영). */
  expiry: ExpiryStatus;
  /** 위급(부족·임박·지남 중 하나라도) — 정렬·주의 카운트용. */
  urgent: boolean;
}

// products + lots → 정렬된 InventoryRow[]. 정렬: 위급 우선 → D-day 오름차순(Lot 없는 상품은 뒤).
export function buildInventory(
  products: Product[],
  lots: Lot[],
  threshold: number
): InventoryRow[] {
  // productId → Lot[] 묶기(한 번 순회).
  const byProduct = new Map<string, Lot[]>();
  for (const lot of lots) {
    const arr = byProduct.get(lot.productId);
    if (arr) arr.push(lot);
    else byProduct.set(lot.productId, [lot]);
  }

  const rows: InventoryRow[] = products.map((product) => {
    const own = byProduct.get(product.id) ?? [];
    const stock = own.reduce((sum, l) => sum + l.quantity, 0);
    const nearestExpiry = own.reduce<string | null>(
      (min, l) => (min === null || l.expiryDate < min ? l.expiryDate : min),
      null
    );
    const low = stock <= LOW_STOCK_THRESHOLD;
    const expiry = nearestExpiry ? expiryStatus(nearestExpiry, threshold) : null;
    return {
      product,
      stock,
      nearestExpiry,
      dday: nearestExpiry ? dDay(nearestExpiry) : null,
      low,
      expiry,
      urgent: low || expiry !== null,
    };
  });

  return sortInventory(rows);
}

// 위급 우선 → D-day 오름차순(null은 맨 뒤).
function sortInventory(rows: InventoryRow[]): InventoryRow[] {
  return [...rows].sort((a, b) => {
    if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
    if (a.dday === null) return b.dday === null ? 0 : 1;
    if (b.dday === null) return -1;
    return a.dday - b.dday;
  });
}

/** 상단바 '주의 N건' — 위급 상품 수. */
export function urgentCount(rows: InventoryRow[]): number {
  return rows.reduce((n, r) => n + (r.urgent ? 1 : 0), 0);
}
