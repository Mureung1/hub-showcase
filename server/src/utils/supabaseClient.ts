import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 환경 변수 로드
dotenv.config();

const supabaseUrl: string = process.env.SUPABASE_URL || '';
const supabaseKey: string = process.env.SUPABASE_KEY || '';

let supabase: SupabaseClient | null = null;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Warning: SUPABASE_URL or SUPABASE_KEY is missing from environment variables. Supabase client is not initialized.');
} else {
  supabase = createClient(supabaseUrl, supabaseKey);
}

export default supabase;
