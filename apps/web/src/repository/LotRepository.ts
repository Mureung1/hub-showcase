import type { Lot } from "@sherpa/core";

// 입고 배치(Lot) 저장의 seam. ProductRepository와 같은 이유로 UI/커밋은 이 인터페이스에만
// 의존한다 — 이후 API/서버 DB로 교체 가능. 재고 수량의 source of truth는 Lot(§3).
export interface LotRepository {
  /** 입고 확정 시 세션 라인들을 한 번에 새 Lot으로 반영. */
  saveMany(lots: Lot[]): Promise<void>;
  /** 전체 Lot(재고 합·유통기한 집계용). */
  getAll(): Promise<Lot[]>;
}
