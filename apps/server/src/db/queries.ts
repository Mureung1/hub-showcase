import { getSupabase } from "./client";
import type { WeatherCondition, EnsembleWeather, Proposal } from "shared";
import type { SalesWithWeather } from "../agent/diagnose";

export interface StoreRow {
  id: string;
  name: string;
  category: string | null;
  menu_tags: string[] | null;
  tone: string | null;
  nx: number;
  ny: number;
  lat: number;
  lng: number;
}

const STORE_COLUMNS = "id, name, category, menu_tags, tone, nx, ny, lat, lng";

/**
 * 기본 매장(첫 매장)을 조회한다.
 * MVP는 매장이 1개라 storeId가 없으면 이걸 쓴다.
 */
export async function getFirstStore(): Promise<StoreRow> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("stores")
    .select(STORE_COLUMNS)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();
  if (error || !data) throw new Error(`매장을 찾을 수 없습니다: ${error?.message ?? "empty"}`);
  return data as StoreRow;
}

/** storeId로 매장을 조회한다. */
export async function getStoreById(storeId: string): Promise<StoreRow> {
  const sb = getSupabase();
  const { data, error } = await sb.from("stores").select(STORE_COLUMNS).eq("id", storeId).single();
  if (error || !data) throw new Error(`매장을 찾을 수 없습니다: ${error?.message ?? storeId}`);
  return data as StoreRow;
}

/** 매장의 일매출을 진단 입력 형태(매출 + 날씨 스냅샷)로 조회한다. */
export async function getSalesWithWeather(storeId: string): Promise<SalesWithWeather[]> {
  const sb = getSupabase();
  const { data } = await sb
    .from("daily_sales")
    .select("revenue, weather_snapshot")
    .eq("store_id", storeId);
  return (data ?? []).map((r) => {
    const w = r.weather_snapshot as { condition: WeatherCondition; isPrecipitating: boolean } | null;
    return {
      revenue: r.revenue as number,
      weather: w ? { condition: w.condition, isPrecipitating: w.isPrecipitating } : null,
    };
  });
}

// ---- 캠페인 (제안 저장·조회) ------------------------------------------------

export interface CampaignRow {
  id: string;
  store_id: string;
  date: string;
  weather: EnsembleWeather | null;
  proposal: Proposal | null;
  edited_copy: string | null;
  channels: string[] | null;
  status: string;
  created_at: string;
}

/** 매장 로컬(KST) 기준 오늘 날짜 YYYY-MM-DD. */
export function todayYmdKst(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

/**
 * 오늘 제안을 campaigns에 저장한다(status draft).
 * 같은 (store_id, date)가 있으면 갱신, 없으면 새로 만든다.
 */
export async function saveTodayCampaign(
  storeId: string,
  date: string,
  weather: EnsembleWeather,
  proposal: Proposal,
): Promise<CampaignRow> {
  const sb = getSupabase();
  const payload = {
    store_id: storeId,
    date,
    weather,
    proposal,
    channels: proposal.channels,
    status: "draft",
  };

  const existing = await sb
    .from("campaigns")
    .select("id")
    .eq("store_id", storeId)
    .eq("date", date)
    .limit(1)
    .maybeSingle();

  const q = existing.data
    ? sb.from("campaigns").update(payload).eq("id", existing.data.id)
    : sb.from("campaigns").insert(payload);

  const { data, error } = await q.select().single();
  if (error || !data) throw new Error(`캠페인 저장 실패: ${error?.message ?? "empty"}`);
  return data as CampaignRow;
}

/** 오늘 저장된 캠페인을 조회한다. 없으면 null. */
export async function getTodayCampaign(
  storeId: string,
  date: string,
): Promise<CampaignRow | null> {
  const sb = getSupabase();
  const { data } = await sb
    .from("campaigns")
    .select("*")
    .eq("store_id", storeId)
    .eq("date", date)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as CampaignRow) ?? null;
}
