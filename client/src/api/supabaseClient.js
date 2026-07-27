import { createClient } from '@supabase/supabase-js';

// 프론트엔드용 Supabase 클라이언트 인스턴스
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
