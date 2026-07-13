// Sherpa 도메인 타입 — IndexedDB(로컬)와 MySQL(서버)이 공유하는 스키마.
// PK는 auto-increment가 아니라 클라이언트 생성 UUID(string)로 통일한다.
// 이유·설계 판단은 docs/slice-0-decisions.md 참고.

/** 상품 */
export interface Product {
  /** 클라이언트 생성 UUID (crypto.randomUUID()) — IndexedDB/MySQL 공유 PK */
  id: string;
  /** 조회 키. unique, indexed */
  barcode: string;
  /** 상품명 */
  name: string;
  /** 카테고리 (예: 유제품, 가공식품, 음료 …) */
  category: string;
  /** 생성 시각, epoch ms */
  createdAt: number;
  /** 수정 시각, epoch ms — 이후 동기화 판단용 */
  updatedAt: number;
}

/**
 * 입고 배치(Lot). Slice 0에서는 타입만 정의하고 조회/생성하지 않는다.
 * 재고 수량은 Product가 아니라 Lot에만 둔다 — Product 총재고 = Lot 합(파생값).
 */
export interface Lot {
  /** 클라이언트 생성 UUID — 공유 PK */
  id: string;
  /** Product.id FK, indexed */
  productId: string;
  /** 유통기한, 'YYYY-MM-DD'. 문자열 사전순 = 날짜순(FEFO 정렬 안전) */
  expiryDate: string;
  /** 이 Lot의 재고 수량 */
  quantity: number;
  /** 입고 시각, epoch ms */
  inboundAt: number;
  /** 수정 시각, epoch ms — 이후 동기화 판단용 */
  updatedAt: number;
}
