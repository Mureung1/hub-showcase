// #14 "Supabase 프로젝트 생성 및 마이그레이션" — .env로 연결하는 단일 클라이언트.
// 참고 데이터(caffeine_reference/sensitivity_halflife/safety_limits) 조회 전용 —
// 사용자 스케줄은 저장하지 않으므로 이 클라이언트로 INSERT/UPDATE는 하지 않는다.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("SUPABASE_URL / SUPABASE_ANON_KEY가 .env에 설정되어 있지 않습니다.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
