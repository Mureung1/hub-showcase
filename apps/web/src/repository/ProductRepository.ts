import type { Product } from "@sherpa/core";

// 상품 조회의 seam. 지금은 Dexie 구현이지만, 이후 API/서버 DB로 교체 가능하게
// UI는 이 인터페이스에만 의존한다.
export interface ProductRepository {
  findByBarcode(barcode: string): Promise<Product | undefined>;
  /** 상품 마스터 저장(신규/갱신). 등록 모달 저장 시 호출 → 이후 스캔부터 등록됨으로 인식. */
  save(product: Product): Promise<void>;
}
