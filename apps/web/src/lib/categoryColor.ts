// 카테고리 점 색. 디자인 헌법(§8)이 확정한 콘텐츠 색은 과일=주황·야채=초록 둘뿐이며,
// "카테고리 팔레트 확장은 협의"가 원칙이라 그 외 카테고리는 임의 색을 만들지 않고 중립 회색으로 둔다.
// (팔레트가 협의로 늘면 여기 한 곳만 고치면 된다.)
const CATEGORY_DOT: Record<string, string> = {
  과일: "#D98A4E",
  야채: "#8CB56A",
};

const NEUTRAL_DOT = "#9aa89f";

export function categoryColor(category: string): string {
  return CATEGORY_DOT[category] ?? NEUTRAL_DOT;
}
