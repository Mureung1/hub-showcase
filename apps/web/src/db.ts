import Dexie, { type Table } from "dexie";
import type { Product, Lot } from "@sherpa/core";

// 로컬 우선(local-first) 1차 데이터 소스. MySQL 동기화는 이후 Slice.
// 스토어 선언은 스키마와 1:1 대응:
//   products: 'id, &barcode, updatedAt'
//   lots:     'id, productId, expiryDate, updatedAt'
// (&barcode = unique index / id는 UUID이므로 ++ 미사용)
export class SherpaDB extends Dexie {
  products!: Table<Product, string>;
  lots!: Table<Lot, string>;

  constructor() {
    super("sherpa");
    this.version(1).stores({
      products: "id, &barcode, updatedAt",
      lots: "id, productId, expiryDate, updatedAt",
    });
  }
}

export const db = new SherpaDB();
