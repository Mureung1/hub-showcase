import type { WeatherCondition } from "shared";
import { getSupabase } from "./client";

/**
 * 데모·진단(2-1) 개발용 더미 시드.
 *
 * ⚠️ 전부 가짜 데이터다. 실개인정보(실명·실번호)를 넣지 않는다.
 * 매장 1개 / 단골 142명(수신동의 98) / 일매출 30일치를 넣는다.
 * 일매출은 진단 로직이 상관을 찾을 수 있도록 날씨 유형별 계수로 생성한다.
 *
 * 실행: apps/server 에서 `npx tsx --env-file=.env src/db/seed.ts`
 * 재실행하면 기존 매장을 지우고(cascade) 새로 채운다.
 */

const STORE = {
  name: "김사장 카페",
  category: "카페",
  menu_tags: ["아메리카노", "콜드브루", "라떼", "스콘"],
  tone: "친근",
  lat: 35.1578,
  lng: 129.0594,
  nx: 98,
  ny: 75,
};

const CUSTOMER_TOTAL = 142;
const CUSTOMER_CONSENT = 98;
const SALES_DAYS = 30;
const BASE_REVENUE = 840_000;

// 날씨 유형별 매출 계수 (맑을수록 매출↑, 비 오면↓)
const FACTOR: Record<WeatherCondition, number> = {
  clear: 1.12,
  cloudy: 1.02,
  overcast: 0.95,
  rain: 0.82,
  shower: 0.85,
  snow: 0.8,
  sleet: 0.82,
};

// 30일 날씨 패턴 (결정적 — 데모 재현성). 비/소나기가 섞여 상관을 만든다.
const PATTERN: WeatherCondition[] = [
  "clear", "cloudy", "overcast", "rain", "clear", "clear", "cloudy", "shower",
  "clear", "overcast", "rain", "clear", "cloudy", "clear", "rain", "clear",
  "cloudy", "overcast", "clear", "rain", "clear", "clear", "cloudy", "shower",
  "clear", "overcast", "rain", "clear", "cloudy", "clear",
];

const ymd = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function buildCustomers(storeId: string) {
  return Array.from({ length: CUSTOMER_TOTAL }, (_, i) => ({
    store_id: storeId,
    name: `단골${String(i + 1).padStart(3, "0")}`, // 더미 이름
    phone: `010-0000-${String(1000 + i).slice(-4)}`, // 더미 번호 (실번호 아님)
    consent_at: i < CUSTOMER_CONSENT ? "2026-05-01T00:00:00Z" : null,
    opt_out_at: null,
  }));
}

function buildDailySales(storeId: string, today: Date) {
  return Array.from({ length: SALES_DAYS }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (SALES_DAYS - 1 - i)); // 29일 전 → 오늘
    const condition = PATTERN[i];
    const isPrecipitating = condition === "rain" || condition === "shower";
    // ±5% 결정적 노이즈로 현실감
    const noise = 1 + (((i * 37) % 11) - 5) / 100;
    const revenue = Math.round((BASE_REVENUE * FACTOR[condition] * noise) / 1000) * 1000;
    return {
      store_id: storeId,
      date: ymd(d),
      revenue,
      weather_snapshot: {
        condition,
        isPrecipitating,
        tempC: 26 + (i % 7), // 7월 26~32℃
        precipitationMm: isPrecipitating ? 3 + (i % 4) : 0,
      },
    };
  });
}

async function main() {
  const sb = getSupabase();

  // 기존 매장 제거 → customers·daily_sales는 FK cascade로 함께 삭제
  const { error: delErr } = await sb.from("stores").delete().not("id", "is", null);
  if (delErr) throw new Error(`기존 데이터 삭제 실패: ${delErr.message}`);

  const { data: store, error: storeErr } = await sb
    .from("stores")
    .insert(STORE)
    .select()
    .single();
  if (storeErr || !store) throw new Error(`매장 삽입 실패: ${storeErr?.message}`);

  const { error: custErr } = await sb.from("customers").insert(buildCustomers(store.id));
  if (custErr) throw new Error(`단골 삽입 실패: ${custErr.message}`);

  const { error: salesErr } = await sb
    .from("daily_sales")
    .insert(buildDailySales(store.id, new Date()));
  if (salesErr) throw new Error(`일매출 삽입 실패: ${salesErr.message}`);

  console.log(`✓ 매장 1건 (${store.name}, id=${store.id})`);
  console.log(`✓ 단골 ${CUSTOMER_TOTAL}건 (수신동의 ${CUSTOMER_CONSENT})`);
  console.log(`✓ 일매출 ${SALES_DAYS}건`);
}

main().catch((e) => {
  console.error("시드 실패:", e instanceof Error ? e.message : e);
  process.exit(1);
});
