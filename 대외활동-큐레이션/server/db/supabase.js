// Supabase 클라이언트. 키는 .env 에서 온다.
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

export const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// TODO(1): 테이블은 docs/schema.md 부록1 참고.
// profiles, sources, raw_postings, postings, parse_logs
