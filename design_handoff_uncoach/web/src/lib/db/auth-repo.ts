// 계정·세션 데이터 접근 계층
import { db } from "./client";
import type { AppStateBlob } from "../domain/types";

export interface UserRow {
  id: string;
  email: string;
  pass_hash: string;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const sql = db();
  const rows = await sql`select id, email, pass_hash from users where email = ${email.toLowerCase()}`;
  return rows.length ? (rows[0] as UserRow) : null;
}

export async function createUser(id: string, email: string, passHash: string): Promise<void> {
  const sql = db();
  await sql`insert into users (id, email, pass_hash) values (${id}, ${email.toLowerCase()}, ${passHash})`;
}

export async function insertSession(token: string, userId: string, expiresAt: Date): Promise<void> {
  const sql = db();
  await sql`insert into auth_sessions (token, user_id, expires_at) values (${token}, ${userId}, ${expiresAt})`;
}

export async function findSessionUser(token: string): Promise<{ id: string; email: string } | null> {
  const sql = db();
  const rows = await sql`
    select u.id, u.email
    from auth_sessions s join users u on u.id = s.user_id
    where s.token = ${token} and s.expires_at > now()`;
  return rows.length ? (rows[0] as { id: string; email: string }) : null;
}

export async function deleteSession(token: string): Promise<void> {
  const sql = db();
  await sql`delete from auth_sessions where token = ${token}`;
}

/** 계정에 상태가 없으면 익명(기기) 상태를 이관해 진척을 이어준다. */
export async function adoptBlobIfEmpty(ownerId: string, fromDeviceId: string): Promise<void> {
  const sql = db();
  const existing = await sql`select 1 from app_state where device_id = ${ownerId}`;
  if (existing.length) return;
  const dev = await sql`select data from app_state where device_id = ${fromDeviceId}`;
  if (!dev.length) return;
  const data = dev[0].data as AppStateBlob;
  await sql`
    insert into app_state (device_id, data, updated_at)
    values (${ownerId}, ${sql.json(data as unknown as Parameters<typeof sql.json>[0])}, now())
    on conflict (device_id) do nothing`;
}
