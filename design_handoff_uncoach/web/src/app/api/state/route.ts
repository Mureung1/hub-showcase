import { NextRequest, NextResponse } from 'next/server';
import { getOwnerId } from '@/lib/server/auth';
import { getBlob, saveBlob } from '@/lib/db/repo';
import { dbConfigured } from '@/lib/db/client';
import { sanitizeBlob } from '@/lib/domain/blob';
import type { AppStateBlob } from '@/lib/domain/types';

export const runtime = 'nodejs';

/** 현재 소유자(계정 또는 기기)의 저장 상태를 반환 (DB 미설정 시 null → 클라이언트가 localStorage 폴백) */
export async function GET() {
  const id = await getOwnerId();
  if (!dbConfigured()) return NextResponse.json({ state: null, persisted: false });
  try {
    const state = await getBlob(id);
    return NextResponse.json({ state: state ?? null, persisted: true });
  } catch (e) {
    console.error('[api/state:get]', e);
    return NextResponse.json({ state: null, persisted: false, error: 'DB 연결 실패' });
  }
}

/** 현재 소유자(계정 또는 기기)의 상태 blob 저장 */
export async function PUT(req: NextRequest) {
  const id = await getOwnerId();
  let body: { state?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 });
  }
  const state: AppStateBlob = sanitizeBlob(body.state);
  if (!dbConfigured()) return NextResponse.json({ persisted: false });
  try {
    await saveBlob(id, state);
    return NextResponse.json({ persisted: true });
  } catch (e) {
    console.error('[api/state:put]', e);
    return NextResponse.json({ persisted: false, error: 'DB 저장 실패' }, { status: 500 });
  }
}
