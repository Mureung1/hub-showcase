import { randomUUID } from "node:crypto";
import { supabase } from "../db/index.js";
import { ApiError } from "../utils/ApiError.js";

// Postgres에도 배열/객체 타입인 jsonb를 안 쓰고 SQLite 때와 동일하게 JSON 문자열로
// 저장한다 — 스키마를 그대로 재사용하기 위함. camelCase(API) <-> snake_case(DB)
// 매핑도 이 파일에서만 다룬다.
const COLUMNS = [
  "id",
  "type",
  "purpose",
  "notice_type",
  "title",
  "content",
  "seo_keywords",
  "hashtags",
  "images",
  "thumbnail_url",
  "view_count",
  "status",
  "scheduled_at",
  "published_at",
  "suggested_publish_time",
  "menu_name",
  "launch_date",
  "event_name",
  "event_type",
  "event_detail",
  "event_period_start",
  "event_period_end",
  "general_topic",
  "general_detail",
  "created_at",
  "updated_at",
];

function toRow(post) {
  return {
    id: post.id,
    type: post.type,
    purpose: post.purpose ?? null,
    notice_type: post.noticeType ?? null,
    title: post.title,
    content: post.content,
    seo_keywords: JSON.stringify(post.seoKeywords ?? []),
    hashtags: JSON.stringify(post.hashtags ?? []),
    images: JSON.stringify(post.images ?? []),
    thumbnail_url: post.thumbnailUrl ?? null,
    view_count: post.viewCount ?? 0,
    status: post.status ?? "draft",
    scheduled_at: post.scheduledAt ?? null,
    published_at: post.publishedAt ?? null,
    suggested_publish_time: post.suggestedPublishTime ? JSON.stringify(post.suggestedPublishTime) : null,
    menu_name: post.menuName ?? null,
    launch_date: post.launchDate ?? null,
    event_name: post.eventName ?? null,
    event_type: post.eventType ?? null,
    event_detail: post.eventDetail ?? null,
    event_period_start: post.eventPeriodStart ?? null,
    event_period_end: post.eventPeriodEnd ?? null,
    general_topic: post.generalTopic ?? null,
    general_detail: post.generalDetail ?? null,
    created_at: post.createdAt,
    updated_at: post.updatedAt,
  };
}

function fromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    purpose: row.purpose,
    noticeType: row.notice_type,
    title: row.title,
    content: row.content,
    seoKeywords: JSON.parse(row.seo_keywords),
    hashtags: JSON.parse(row.hashtags),
    images: JSON.parse(row.images),
    thumbnailUrl: row.thumbnail_url,
    viewCount: row.view_count,
    status: row.status,
    scheduledAt: row.scheduled_at,
    publishedAt: row.published_at,
    suggestedPublishTime: row.suggested_publish_time ? JSON.parse(row.suggested_publish_time) : null,
    menuName: row.menu_name,
    launchDate: row.launch_date,
    eventName: row.event_name,
    eventType: row.event_type,
    eventDetail: row.event_detail,
    eventPeriodStart: row.event_period_start,
    eventPeriodEnd: row.event_period_end,
    generalTopic: row.general_topic,
    generalDetail: row.general_detail,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createPost(fields) {
  const now = new Date().toISOString();
  const post = {
    id: randomUUID(),
    seoKeywords: [],
    hashtags: [],
    images: [],
    viewCount: 0,
    status: "draft",
    scheduledAt: null,
    publishedAt: null,
    suggestedPublishTime: null,
    createdAt: now,
    updatedAt: now,
    ...fields,
  };

  const { error } = await supabase.from("posts").insert(toRow(post));
  if (error) throw new ApiError(500, "DB_ERROR", error.message);
  return post;
}

export async function listPosts({ status } = {}) {
  let query = supabase.from("posts").select(COLUMNS.join(",")).order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw new ApiError(500, "DB_ERROR", error.message);
  return data.map(fromRow);
}

export async function getPostById(id) {
  const { data, error } = await supabase.from("posts").select(COLUMNS.join(",")).eq("id", id).maybeSingle();
  if (error) throw new ApiError(500, "DB_ERROR", error.message);
  return fromRow(data);
}

export async function updatePost(id, patch) {
  const existing = await getPostById(id);
  if (!existing) return null;

  const merged = { ...existing, ...patch, id: existing.id, updatedAt: new Date().toISOString() };
  const { error } = await supabase.from("posts").update(toRow(merged)).eq("id", id);
  if (error) throw new ApiError(500, "DB_ERROR", error.message);
  return merged;
}
