import { randomBytes } from "node:crypto";
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

/** 캠페인 부분 갱신 필드 (승인/수정/반려). */
export interface CampaignPatch {
  status?: string;
  edited_copy?: string;
  channels?: string[];
  /** 편집된 프로모션(할인율). 컬럼이 아니라 proposal jsonb 안 promo에 병합된다. */
  editedPromo?: { type: string; value: string };
}

/**
 * 캠페인을 부분 갱신한다(PATCH /campaigns/:id).
 * editedPromo는 전용 컬럼이 아니라 proposal jsonb 안 promo → 현재 proposal을 읽어 병합해 다시 저장한다(read-modify-write).
 */
export async function updateCampaign(id: string, patch: CampaignPatch): Promise<CampaignRow> {
  const sb = getSupabase();
  const { editedPromo, ...columns } = patch;

  const dbPatch: Record<string, unknown> = { ...columns };
  if (editedPromo) {
    const current = await getCampaignById(id);
    if (!current) throw new Error(`캠페인을 찾을 수 없습니다: ${id}`);
    if (current.proposal) {
      dbPatch.proposal = {
        ...current.proposal,
        promo: { ...current.proposal.promo, ...editedPromo },
      };
    }
  }

  const { data, error } = await sb
    .from("campaigns")
    .update(dbPatch)
    .eq("id", id)
    .select()
    .single();
  if (error || !data) throw new Error(`캠페인 갱신 실패: ${error?.message ?? id}`);
  return data as CampaignRow;
}

/** id로 캠페인 1건 조회. 없으면 null. */
export async function getCampaignById(id: string): Promise<CampaignRow | null> {
  const sb = getSupabase();
  const { data } = await sb.from("campaigns").select("*").eq("id", id).maybeSingle();
  return (data as CampaignRow) ?? null;
}

// ---- 단골(고객) · 쿠폰 -------------------------------------------------------

/** 광고 발송 대상 판정에 필요한 최소 필드 (legal.Recipient 호환). */
export interface CustomerRow {
  id: string;
  phone: string | null;
  consent_at: string | null;
  opt_out_at: string | null;
}

/** 매장의 단골 전체를 조회한다(수신동의 필터는 legal.filterConsented가 담당). */
export async function getCustomers(storeId: string): Promise<CustomerRow[]> {
  const sb = getSupabase();
  const { data } = await sb
    .from("customers")
    .select("id, phone, consent_at, opt_out_at")
    .eq("store_id", storeId);
  return (data ?? []) as CustomerRow[];
}

/**
 * 쿠폰 코드 생성 — 헷갈림 없는 5자.
 * 사람이 문자로 받아 읽고 부르는 코드라, 혼동되는 0·O·1·I·L 을 뺀 문자 집합에서 뽑는다.
 * (구 방식 "WP"+8hex(10자) → 5자로 단축해 가독성↑. 문자 본문 "쿠폰코드 XXXXX"에 쓰인다.)
 */
const COUPON_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // 0·O·1·I·L 제외
const COUPON_CODE_LEN = 5;

function newCouponCode(): string {
  const bytes = randomBytes(COUPON_CODE_LEN);
  let code = "";
  for (let i = 0; i < COUPON_CODE_LEN; i++) {
    // modulo 편향은 있으나 쿠폰 코드엔 무해(집합 31자). 균일성보다 가독성 우선.
    code += COUPON_ALPHABET[bytes[i] % COUPON_ALPHABET.length];
  }
  return code;
}

/**
 * 발송 시 동의 단골마다 쿠폰을 발급한다(코드별 누적 추적용). 발급된 코드 목록을 돌려준다.
 * issued_to는 customers(id) FK — 진짜 발송은 본인 번호 1건뿐이지만, 추적 집계를 위해 대상 수만큼 발급.
 *
 * 코드가 짧아진 만큼(5자) 전역 유니크 충돌 확률이 커졌다 → 충돌 시 코드 전체를 1회 재생성해 재시도한다.
 */
export async function issueCouponsFor(
  campaignId: string,
  recipients: { id: string }[],
): Promise<string[]> {
  if (recipients.length === 0) return [];
  const sb = getSupabase();
  const buildRows = () =>
    recipients.map((r) => ({
      campaign_id: campaignId,
      code: newCouponCode(),
      issued_to: r.id,
    }));

  let rows = buildRows();
  const first = await sb.from("coupons").insert(rows);
  if (first.error) {
    // 유니크 충돌 등 → 코드 재생성 후 1회 재시도
    rows = buildRows();
    const retry = await sb.from("coupons").insert(rows);
    if (retry.error) throw new Error(`쿠폰 발급 실패: ${retry.error.message}`);
  }
  return rows.map((r) => r.code);
}

/** 쿠폰을 사용 처리한다. 없거나 이미 사용됐으면 false. */
export async function redeemCoupon(code: string, orderAmount: number): Promise<boolean> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("coupons")
    .update({ used_at: new Date().toISOString(), order_amount: orderAmount })
    .eq("code", code)
    .is("used_at", null)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`쿠폰 사용 처리 실패: ${error.message}`);
  return data != null;
}

/** 캠페인의 쿠폰 사용 현황(집계 입력). */
export async function getCampaignCoupons(
  campaignId: string,
): Promise<{ order_amount: number | null; used_at: string | null }[]> {
  const sb = getSupabase();
  const { data } = await sb
    .from("coupons")
    .select("order_amount, used_at")
    .eq("campaign_id", campaignId);
  return (data ?? []) as { order_amount: number | null; used_at: string | null }[];
}
