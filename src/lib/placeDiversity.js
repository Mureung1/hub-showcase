// '전체' 카테고리로 주변 식당을 검색했을 때, 최종 목록이 한 요리 계열로 쏠리지 않게 고르는 순수
// 선택 함수. MapPage.jsx의 buildKeywordsPrompt는 AI에게 계열을 다양하게 고르라고 "부탁"만 할 뿐이고,
// 실제 다양성 보장은 여기(결정적 로직)가 한다 — AI가 그 지시를 안 따라도 결과는 다양해야 한다.
//
// 특정 카테고리(한식/중식/...)를 고른 경우는 이 함수를 아예 호출하지 않는다(MapPage.jsx의
// searchAroundPosition이 category.key === 'all'일 때만 부른다) — 그 경로는 기존 동작 그대로다.
import { FOOD_CATEGORIES, matchesFoodCategory } from './foodCategory.js'

function placeIdentity(place) {
  return place.place_url || `${place.place_name}|${place.road_address_name}`
}

// FOOD_CATEGORIES 순서대로 첫 매치를 그 장소의 계열로 삼는다. 어느 것도 안 맞으면 '기타' 버킷 —
// 후보가 통째로 누락되는 일은 없어야 하므로(다양성보다 "5개 채우기"가 항상 우선) 항상 어딘가에 속한다.
function cuisineKeyOf(place) {
  const found = FOOD_CATEGORIES.find((c) => c.key !== 'all' && matchesFoodCategory(c.key, place.category_name))
  return found ? found.key : 'etc'
}

// candidates: 거리순 정렬된 후보 배열(중복 제거 완료, 각 항목에 matchedTarget이 있으면 그 값을 겨냥한
// 부족 영양소 키, 없으면 null/undefined). targetCount만큼 뽑는다.
//
// 1단계 — 영양 고정 픽: 서로 다른 matchedTarget마다 가장 가까운 후보를 하나씩 확정한다. 이게 "영양
// 충족이 항상 최우선"을 보장하는 부분 — 다양화 로직이 끼어들기 전에 먼저 채워진다.
// 2단계 — 계열 라운드로빈: 남은 자리를 서로 다른 요리 계열에서 순서대로 하나씩 채운다. 계열별 상한
// (ceil(targetCount / 버킷 수))을 둬 한 계열이 목록을 독식하지 못하게 한다.
// 3단계 — 거리순 채우기: 그래도 자리가 남으면(다양화할 후보가 부족하면) 그냥 가까운 순으로 채운다 —
// "5개를 채우는 것"이 "다양하게 채우는 것"보다 항상 우선한다.
//
// 반환 순서: 1단계 고정 픽을 배열 맨 앞에 둔다 — mergeOccupationPlaces가 이 배열을 뒤에서부터 잘라낼
// 수 있으므로(호출부 참고), 영양 고정 픽이 그 트렁케이션에 먼저 잘리지 않도록 보호한다.
export function diversifyByCategory(candidates, { targetCount }) {
  if (candidates.length <= targetCount) return candidates

  const picked = []
  const ids = new Set()
  const take = (place) => {
    picked.push(place)
    ids.add(placeIdentity(place))
  }

  const seenTargets = new Set()
  for (const c of candidates) {
    if (picked.length >= targetCount) break
    if (!c.matchedTarget || seenTargets.has(c.matchedTarget)) continue
    seenTargets.add(c.matchedTarget)
    take(c)
  }
  const lockedCount = picked.length

  const buckets = new Map()
  for (const c of candidates) {
    const key = cuisineKeyOf(c)
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(c)
  }
  const cap = Math.max(1, Math.ceil(targetCount / Math.max(1, buckets.size)))
  const usedByBucket = new Map()
  for (const c of picked) {
    const key = cuisineKeyOf(c)
    usedByBucket.set(key, (usedByBucket.get(key) || 0) + 1)
  }

  let progress = true
  while (picked.length < targetCount && progress) {
    progress = false
    for (const [key, list] of buckets) {
      if (picked.length >= targetCount) break
      if ((usedByBucket.get(key) || 0) >= cap) continue
      const next = list.find((c) => !ids.has(placeIdentity(c)))
      if (!next) continue
      take(next)
      usedByBucket.set(key, (usedByBucket.get(key) || 0) + 1)
      progress = true
    }
  }

  for (const c of candidates) {
    if (picked.length >= targetCount) break
    if (!ids.has(placeIdentity(c))) take(c)
  }

  return [...picked.slice(0, lockedCount), ...picked.slice(lockedCount).sort((a, b) => a.distance - b.distance)]
}
