// 데이터 접근 계층 — 앱 상태 blob(app_state) 저장/조회
import { db } from './client';
import type { AppStateBlob } from '../domain/types';

export async function getBlob(id: string): Promise<AppStateBlob | null> {
  const sql = db();
  const rows = await sql`select data from app_state where device_id = ${id}`;
  return rows.length ? (rows[0].data as AppStateBlob) : null;
}

export async function saveBlob(id: string, data: AppStateBlob): Promise<void> {
  const sql = db();
  await sql`
    insert into app_state (device_id, data, updated_at)
    values (${id}, ${sql.json(data as unknown as Parameters<typeof sql.json>[0])}, now())
    on conflict (device_id) do update set data = excluded.data, updated_at = now()`;
}
