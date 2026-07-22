// Supabase 클라이언트 — **인증 전용**. 데이터 CRUD는 전부 FastAPI(taxengine/api)를 거친다
// (아키텍처 결정 2026-07-22: FE → FastAPI → Supabase Postgres, supabase-js는 JWT 취득에만 사용).
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // 설정이 빠졌으면 조용히 익명으로 도는 것보다 시끄럽게 실패하는 쪽이 안전 (BE auth.py와 같은 원칙)
  throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY가 없어요 — taxwiz-fe/.env.local을 확인하세요.');
}

export const supabase = createClient(url, anonKey);
