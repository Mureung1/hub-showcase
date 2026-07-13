import type { Lot } from "@sherpa/core";
import { db } from "../db";
import type { LotRepository } from "./LotRepository";

// Dexie(IndexedDB) 기반 구현. Lot.id는 클라이언트 UUID이므로 bulkAdd로 그대로 삽입.
class DexieLotRepository implements LotRepository {
  async saveMany(lots: Lot[]): Promise<void> {
    if (lots.length === 0) return;
    await db.lots.bulkAdd(lots);
  }

  getAll(): Promise<Lot[]> {
    return db.lots.toArray();
  }
}

export const lotRepository: LotRepository = new DexieLotRepository();
