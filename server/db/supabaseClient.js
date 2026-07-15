import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'SUPABASE_URL / SUPABASE_SERVICE_KEY가 설정되지 않았습니다. .env 파일을 확인하세요 (.env.example 참고).'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
