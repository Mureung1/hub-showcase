// 재료 칩을 선택했을 때 냉장고 일러스트(fridge-empty.png)의 어느 위치로 날아 들어가는지 정의.
// 좌표는 그 이미지 기준 퍼센트(%) 위치 — 이미지 크기가 바뀌어도 그대로 맞는다.
export const FRIDGE_ZONE_SLOTS = {
  // 문칸 — 액체류(우유·음료·소스 등)가 들어갈 자리. 지금은 이 존을 쓰는 재료가 없음(아래 getStorageZone 참고).
  door: [
    { x: 57, y: 24 },
    { x: 57, y: 36 },
    { x: 57, y: 48 },
    { x: 57, y: 60 },
    { x: 57, y: 72 },
  ],
  // 메인 칸(위쪽 선반) — 채소를 제외한 나머지 재료
  shelf: [
    { x: 24, y: 48 }, { x: 35, y: 48 },
    { x: 24, y: 60 }, { x: 35, y: 60 },
    { x: 24, y: 71 }, { x: 35, y: 71 },
  ],
  // 신선칸(하단 서랍) — 채소
  crisper: [
    { x: 24, y: 89 },
    { x: 37, y: 89 },
  ],
}

// 재료가 어느 존으로 들어갈지 결정.
// fridgeIngredients.js 항목에 storageZone을 직접 지정하면 그게 우선(예: 나중에 액체류 재료를 추가하면 storageZone: 'door').
// 지정이 없으면 category === 'vegetable'만 신선칸으로, 나머지는 전부 메인 칸으로 보낸다.
export function getStorageZone(ingredient) {
  if (ingredient.storageZone) return ingredient.storageZone
  if (ingredient.category === 'vegetable') return 'crisper'
  return 'shelf'
}
