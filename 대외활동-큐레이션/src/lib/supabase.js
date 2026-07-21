import { createClient } from "@supabase/supabase-js";

// .env에 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY를 넣으면 실제 Supabase에 연결된다.
// 안 넣었으면 null이고, loadPostings가 에러를 던진다(목데이터 폴백 없음).
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key) : null;
