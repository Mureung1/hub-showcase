import { createClient } from "@supabase/supabase-js";

// service_role(비밀) 키 — 브라우저는 Supabase에 직접 붙지 않고 항상 이 서버(Express)를 거치므로,
// RLS를 우회하는 service_role을 서버 전용으로 쓴다. anon 키는 브라우저 직접 연결용이라 여기선 안 씀.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;
