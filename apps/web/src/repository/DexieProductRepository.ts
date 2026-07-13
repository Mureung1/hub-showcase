import type { Product } from "@sherpa/core";
import { db } from "../db";
import type { ProductRepository } from "./ProductRepository";

// Dexie(IndexedDB) 기반 구현. barcode는 &barcode 유니크 인덱스로 조회.
class DexieProductRepository implements ProductRepository {
  findByBarcode(barcode: string): Promise<Product | undefined> {
    return db.products.where("barcode").equals(barcode).first();
  }

  async save(product: Product): Promise<void> {
    await db.products.put(product);
  }

  getAll(): Promise<Product[]> {
    return db.products.toArray();
  }
}

export const productRepository: ProductRepository = new DexieProductRepository();
