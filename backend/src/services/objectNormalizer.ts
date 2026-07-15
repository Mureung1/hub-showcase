// Vision AI가 반환하는 다양한 예측 라벨을 서비스 내부 표준 품목명(Item.name)으로 정규화한다.
// 표준 품목명은 정부 분리배출 API(getItem)의 itemNm 검색어로도 그대로 재사용되므로 Item.name과 동일한 값을 사용한다.
const VISION_LABEL_TO_ITEM_NAME: Record<string, string> = {
  'coke bottle': '플라스틱 음료병',
  'soda bottle': '플라스틱 음료병',
  'soft drink bottle': '플라스틱 음료병',
  'water bottle': '플라스틱 음료병',
  'plastic bottle': '플라스틱 음료병',
  'detergent bottle': '플라스틱 음료병',
  'cooking oil bottle': '플라스틱 음료병',
  battery: '건전지',
  batteries: '건전지',
  'milk carton': '종이팩',
  'juice carton': '종이팩',
  'paper carton': '종이팩',
}

export function normalizeItemName(visionLabel: string): string | null {
  const key = visionLabel.trim().toLowerCase()
  return VISION_LABEL_TO_ITEM_NAME[key] ?? null
}
