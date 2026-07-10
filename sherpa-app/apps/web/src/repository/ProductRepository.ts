import type { Product } from "@sherpa/core";

// 상품 조회의 seam. 지금은 Dexie 구현이지만, 이후 API/서버 DB로 교체 가능하게
// UI는 이 인터페이스에만 의존한다.
export interface ProductRepository {
  findByBarcode(barcode: string): Promise<Product | undefined>;
}
