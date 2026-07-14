import { getSupabase } from "./client";

export interface StoreRow {
  id: string;
  name: string;
  nx: number;
  ny: number;
  lat: number;
  lng: number;
}

/**
 * 기본 매장(첫 매장)을 조회한다.
 * MVP는 매장이 1개라 storeId가 없으면 이걸 쓴다.
 */
export async function getFirstStore(): Promise<StoreRow> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("stores")
    .select("id, name, nx, ny, lat, lng")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();
  if (error || !data) throw new Error(`매장을 찾을 수 없습니다: ${error?.message ?? "empty"}`);
  return data as StoreRow;
}
