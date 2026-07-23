// data/scripts/*.py의 CATEGORIES와 동일 — ETL 파서가 인식하는 상품 카테고리
export const PRODUCT_CATEGORIES = ['김밥', '도시락', '주먹밥', '햄버거샌드위치'] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
