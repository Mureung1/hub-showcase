import { env } from '../env.js';

const KAMIS_TIMEOUT_MS = 8_000;
const BASE_URL = 'http://www.kamis.or.kr/service/price/xml.do';

// KAMIS는 주말·공휴일엔 시세 데이터가 없어서 "오늘" 하루만 조회하면 자주 001(No data)이 뜬다.
// 최근 7일 구간을 조회해 응답 배열의 마지막(가장 최근) 항목을 쓴다.
const LOOKBACK_DAYS = 7;

function ymd(date) {
  return date.toISOString().slice(0, 10);
}

// KAMIS Open API(periodProductList, 소매) 단일 품목 최근 시세 조회.
// 인증키 미설정, 네트워크 실패, 001(데이터 없음) 등 실패 케이스는 전부 null을 반환해서
// 호출부(priceCache.js)가 기존 정적 가격으로 조용히 폴백하게 한다 — clovaOcr.js의 폴백 패턴과 동일.
// kindCode/productRankCode는 기본값을 두지 않는다 — 등급코드는 카테고리마다 유효값이 달라서
// (채소류는 '04', 축산물은 '1'/'2'/'3') 안전한 공통 기본값이 없고, 유일한 호출부인
// ingredientPriceMap.js가 매 id마다 검증된 값을 명시적으로 넘긴다.
export async function fetchRetailPrice({ itemCategoryCode, itemCode, kindCode, productRankCode }) {
  const certKey = env.KAMIS_API_KEY;
  const certId = env.KAMIS_CERT_ID;
  if (!certKey || !certId) return null;

  const endday = new Date();
  const startday = new Date(endday);
  startday.setDate(startday.getDate() - LOOKBACK_DAYS);

  const params = new URLSearchParams({
    action: 'periodProductList',
    p_productclscode: '01', // 01: 소매
    p_startday: ymd(startday),
    p_endday: ymd(endday),
    p_itemcategorycode: itemCategoryCode,
    p_itemcode: itemCode,
    p_kindcode: kindCode,
    // 채소류(200)는 '04'(중품)가 표준이지만 축산물(500)은 이 값이 존재하지 않아 항상 001을 반환한다.
    // 축산물은 '1'/'2'/'3'(1++/1+/1등급) 중 하나를 써야 해서 카테고리별로 다른 값을 넘겨받는다.
    p_productrankcode: productRankCode,
    p_countrycode: '1101', // 서울 고정 — 지역별 조회가 필요해지면 그때 파라미터화
    p_convert_kg_yn: 'N',
    p_cert_key: certKey,
    p_cert_id: certId,
    p_returntype: 'json',
  });

  let json;
  try {
    const res = await fetch(`${BASE_URL}?${params}`, { signal: AbortSignal.timeout(KAMIS_TIMEOUT_MS) });
    if (!res.ok) return null;
    json = await res.json();
  } catch {
    return null;
  }

  const items = Array.isArray(json?.data?.item) ? json.data.item : [];
  if (items.length === 0) return null;

  const latest = items[items.length - 1];
  const price = Number(String(latest.price ?? '').replace(/,/g, ''));
  if (!Number.isFinite(price) || price <= 0) return null;

  return { price, regday: latest.regday, itemname: latest.itemname };
}
