import { randomUUID } from "node:crypto";
import { supabase } from "../db/index.js";
import { ApiError } from "../utils/ApiError.js";

function toRow(profile) {
  return {
    id: profile.id,
    business_type: profile.businessType,
    store_name: profile.storeName,
    main_product: profile.mainProduct,
    target_customer: profile.targetCustomer,
    brand_mood: profile.brandMood,
    strength: profile.strength,
    tone: profile.tone,
    goal: profile.goal,
    summary: profile.summary,
    keywords: JSON.stringify(profile.keywords ?? []),
    created_at: profile.createdAt,
    updated_at: profile.updatedAt,
  };
}

function fromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    businessType: row.business_type,
    storeName: row.store_name,
    mainProduct: row.main_product,
    targetCustomer: row.target_customer,
    brandMood: row.brand_mood,
    strength: row.strength,
    tone: row.tone,
    goal: row.goal,
    summary: row.summary,
    keywords: JSON.parse(row.keywords),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createProfile(fields) {
  const now = new Date().toISOString();
  const profile = { id: randomUUID(), createdAt: now, updatedAt: now, ...fields };

  const { error } = await supabase.from("brand_profiles").insert(toRow(profile));
  if (error) throw new ApiError(500, "DB_ERROR", error.message);
  return profile;
}

// 단일 브랜드 가정 — 여러 행이 있어도 가장 최근 1건만 현재 프로필로 취급한다.
export async function getProfile() {
  const { data, error } = await supabase
    .from("brand_profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new ApiError(500, "DB_ERROR", error.message);
  return fromRow(data);
}

export async function updateProfile(patch) {
  const existing = await getProfile();
  if (!existing) return null;

  const merged = { ...existing, ...patch, id: existing.id, updatedAt: new Date().toISOString() };
  const { error } = await supabase.from("brand_profiles").update(toRow(merged)).eq("id", existing.id);
  if (error) throw new ApiError(500, "DB_ERROR", error.message);
  return merged;
}
