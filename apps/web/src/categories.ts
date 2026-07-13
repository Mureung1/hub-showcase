// 등록 모달에서 고르는 카테고리 목록. 늘려야 하면 여기서 관리(임의 추가 금지, 확인 후).
export const CATEGORIES = [
  "과일",
  "야채",
  "유제품",
  "음료",
  "가공식품",
  "기타",
] as const;

export type Category = (typeof CATEGORIES)[number];
