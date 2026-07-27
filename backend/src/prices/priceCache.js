import { fetchRetailPrice } from './kamisClient.js';
import { priceItemMap } from './ingredientPriceMap.js';
import { ingredients } from '../data/ingredients.js';
import { resolvePrice } from '../data/mealPrices.js';

const TTL_MS = 24 * 60 * 60 * 1000; // KAMIS는 일별 갱신 데이터라 하루 한 번이면 충분

let cache = null; // { updatedAt: Date, prices: { [id]: { avg, diff, source: 'kamis'|'static' } } }

function isStale() {
  return !cache || Date.now() - cache.updatedAt.getTime() > TTL_MS;
}

async function fetchOne(id, def) {
  const prevAvg = cache?.prices?.[id]?.avg ?? resolvePrice(id);
  // def가 없으면(KAMIS에 대응 품목 자체가 없는 경우 — 양념/가공식품 대부분과 일부 신선식품)
  // 호출을 시도하지 않고 바로 정적값을 쓴다.
  const live = def ? await fetchRetailPrice(def).catch(() => null) : null;
  if (live) {
    return { avg: live.price, diff: live.price - prevAvg, source: 'kamis' };
  }
  // 실패 시 직전 캐시값(있으면) 유지, 없으면 원래 정적값으로 폴백 — 가짜 "오늘 시세"를 만들지 않는다.
  return cache?.prices?.[id] ?? { avg: resolvePrice(id), diff: 0, source: 'static' };
}

async function refresh() {
  const ids = ingredients.map((ing) => ing.id);
  const results = await Promise.all(ids.map((id) => fetchOne(id, priceItemMap[id])));
  const prices = {};
  ids.forEach((id, i) => { prices[id] = results[i]; });
  cache = { updatedAt: new Date(), prices };
  return cache;
}

// 캐시가 없거나 하루 이상 지났을 때만 KAMIS를 호출하고, 그 외에는 즉시 캐시를 반환한다.
export async function getPriceSnapshot() {
  if (isStale()) await refresh();
  return cache;
}
