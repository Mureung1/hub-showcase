// 연구 데이터 저장소 선택기 (ADR-002).
// SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY 가 있으면 Supabase 어댑터, 없으면 in-memory 폴백.
// 어댑터 함수는 sync(memory) 또는 async(supabase)이므로, index.js 는 항상 await 로 호출한다.
import * as memory from "./store.memory.js";

let impl = memory;
let backend = "in-memory";

if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  try {
    impl = await import("./store.supabase.js");
    backend = "supabase";
  } catch (error) {
    // 의존성 미설치·연결 실패 시 앱을 죽이지 않고 in-memory 로 폴백한다.
    console.warn(`[store] Supabase 초기화 실패 → in-memory 폴백: ${error.message}`);
    impl = memory;
    backend = "in-memory (supabase fallback)";
  }
}

console.log(`[store] 저장소 어댑터: ${backend}`);

export const STORE_BACKEND = backend;
export const saveResult = (...args) => impl.saveResult(...args);
export const listResults = (...args) => impl.listResults(...args);
export const deleteResults = (...args) => impl.deleteResults(...args);
export const countAll = (...args) => impl.countAll(...args);
export const listAll = (...args) => impl.listAll(...args);
