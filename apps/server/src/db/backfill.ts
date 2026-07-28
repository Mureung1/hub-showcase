import type { WeatherCondition } from "shared";
import { getSupabase } from "./client";
import { getFirstStore } from "./queries";

/**
 * 일매출 공백 구간 백필 (2026-07-15 ~ 07-27).
 *
 * ⚠️ seed.ts와 마찬가지로 전부 가짜 데이터다. 실매출이 아니다.
 *
 * 왜 필요했나: seed는 7/14까지만 깔려 있는데 캠페인은 7/16~7/27에 발송돼 있어
 * daily_sales와 campaigns가 한 날도 겹치지 않았다. 그래서 진단이 2주 전 데이터로 돌고,
 * 발송된 캠페인 5건의 효과를 잴 표본이 아예 없었다.
 *
 * 생성 규칙 — seed.ts와 같은 모델을 그대로 이어붙인다(발표에서 그대로 설명 가능해야 함):
 *   revenue = BASE_REVENUE × FACTOR[날씨] × 노이즈
 *   노이즈  = 1 + (((i × 37) % 11) − 5) / 100   (i는 seed의 0~29에 이어 30부터)
 * 임의로 유리한 값을 넣지 않는다 — 진단(-23% 등)은 이 데이터에서 나오는 수치라
 * 손으로 키우면 발표에서 근거를 댈 수 없게 된다.
 *
 * 캠페인 발송일만 예외로 방어 효과를 얹는다:
 *   FACTOR_방어 = FACTOR + DEFENSE_RECOVERY × (1 − FACTOR)   (손실의 60% 회복 가정)
 * 이 5일은 진단 기준선에서 제외되므로(agent/diagnose.ts) 편차 수치에는 영향이 없고,
 * 방어 효과 측정용 표본으로만 쓰인다.
 *
 * 오늘(07-28)은 넣지 않는다 — 하루가 끝나야 매출이 입력되기 때문.
 *
 * 실행: apps/server 에서 `npm run db:backfill`
 * (store_id, date) upsert라 재실행해도 중복되지 않는다.
 */

const BASE_REVENUE = 840_000; // seed.ts와 동일
const NOISE_OFFSET = 30; // seed가 i=0~29를 썼으므로 그 다음부터
const DEFENSE_RECOVERY = 0.6; // 캠페인이 날씨 손실의 60%를 회복한다는 가정

// 날씨 유형별 매출 계수 — seed.ts FACTOR와 동일해야 한다(통계가 이어지도록).
const FACTOR: Record<WeatherCondition, number> = {
  clear: 1.12,
  cloudy: 1.02,
  overcast: 0.95,
  rain: 0.82,
  shower: 0.85,
  snow: 0.8,
  sleet: 0.82,
};

/**
 * 공백 구간 날씨. campaign=true는 그날 실제로 발송된 캠페인이 DB에 있는 날
 * (campaigns.status='sent': 07-16·21·23·24·27)과 맞춘 것이다.
 * 07-19는 비가 왔지만 발송하지 않은 날 — 무개입 강수 표본을 남겨둬야
 * 진단이 개입일을 빼고도 실측을 유지한다.
 */
const DAYS: { date: string; condition: WeatherCondition; campaign: boolean }[] = [
  { date: "2026-07-15", condition: "clear", campaign: false },
  { date: "2026-07-16", condition: "rain", campaign: true },
  { date: "2026-07-17", condition: "cloudy", campaign: false },
  { date: "2026-07-18", condition: "overcast", campaign: false },
  { date: "2026-07-19", condition: "rain", campaign: false },
  { date: "2026-07-20", condition: "clear", campaign: false },
  { date: "2026-07-21", condition: "rain", campaign: true },
  { date: "2026-07-22", condition: "cloudy", campaign: false },
  { date: "2026-07-23", condition: "shower", campaign: true },
  { date: "2026-07-24", condition: "rain", campaign: true },
  { date: "2026-07-25", condition: "clear", campaign: false },
  { date: "2026-07-26", condition: "cloudy", campaign: false },
  { date: "2026-07-27", condition: "shower", campaign: true },
];

function buildRows(storeId: string) {
  return DAYS.map((d, idx) => {
    const i = NOISE_OFFSET + idx;
    const isPrecipitating = d.condition === "rain" || d.condition === "shower";
    const base = FACTOR[d.condition];
    // 캠페인일은 날씨 손실의 일부를 회복한 것으로 본다.
    const factor = d.campaign ? base + DEFENSE_RECOVERY * (1 - base) : base;
    const noise = 1 + (((i * 37) % 11) - 5) / 100;
    const revenue = Math.round((BASE_REVENUE * factor * noise) / 1000) * 1000;
    return {
      store_id: storeId,
      date: d.date,
      revenue,
      weather_snapshot: {
        condition: d.condition,
        isPrecipitating,
        tempC: 26 + (i % 7),
        precipitationMm: isPrecipitating ? 3 + (i % 4) : 0,
      },
    };
  });
}

async function main() {
  const sb = getSupabase();
  const store = await getFirstStore();
  const rows = buildRows(store.id);

  const { error } = await sb
    .from("daily_sales")
    .upsert(rows, { onConflict: "store_id,date" });
  if (error) throw new Error(`백필 실패: ${error.message}`);

  console.log(`✓ ${store.name} — 일매출 ${rows.length}건 백필 (${DAYS[0].date} ~ ${DAYS.at(-1)?.date})`);
  for (const [idx, r] of rows.entries()) {
    const tag = DAYS[idx].campaign ? " ← 캠페인 발송" : "";
    console.log(`  ${r.date}  ${DAYS[idx].condition.padEnd(8)} ${r.revenue.toLocaleString().padStart(9)}원${tag}`);
  }
}

main().catch((e) => {
  console.error("백필 실패:", e instanceof Error ? e.message : e);
  process.exit(1);
});
