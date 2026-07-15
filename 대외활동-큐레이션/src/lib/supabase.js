import { createClient } from "@supabase/supabase-js";

// .env에 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY를 넣으면 실제 Supabase에 연결된다.
// 아직 안 넣었으면 null이라, loadPostings가 mock으로 fallback 한다.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key) : null;
