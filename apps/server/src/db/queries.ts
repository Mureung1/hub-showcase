import { getSupabase } from "./client";
import type { WeatherCondition } from "shared";
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
