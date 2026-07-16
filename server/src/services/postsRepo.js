import { randomUUID } from "node:crypto";
import { db } from "../db/index.js";

// SQLite는 배열/객체 타입이 없어 seo_keywords/hashtags/images/suggested_publish_time은
// JSON 문자열로 저장한다. camelCase(API) <-> snake_case(DB) 매핑도 이 파일에서만 다룬다.
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

export function createPost(fields) {
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

  const row = toRow(post);
  const placeholders = COLUMNS.map((c) => `@${c}`).join(", ");
  db.prepare(`INSERT INTO posts (${COLUMNS.join(", ")}) VALUES (${placeholders})`).run(row);
  return post;
}

export function listPosts({ status } = {}) {
  const rows = status
    ? db.prepare("SELECT * FROM posts WHERE status = ? ORDER BY created_at DESC").all(status)
    : db.prepare("SELECT * FROM posts ORDER BY created_at DESC").all();
  return rows.map(fromRow);
}

export function getPostById(id) {
  return fromRow(db.prepare("SELECT * FROM posts WHERE id = ?").get(id));
}

export function updatePost(id, patch) {
  const existing = getPostById(id);
  if (!existing) return null;

  const merged = { ...existing, ...patch, id: existing.id, updatedAt: new Date().toISOString() };
  const row = toRow(merged);
  const assignments = COLUMNS.filter((c) => c !== "id")
    .map((c) => `${c} = @${c}`)
    .join(", ");
  db.prepare(`UPDATE posts SET ${assignments} WHERE id = @id`).run(row);
  return merged;
}
