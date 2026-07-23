/**
 * 로그인 시스템이 아직 없어서, 브라우저에 임시 사용자 식별자(UUID)를 저장해두고
 * 모든 API 요청에 x-user-id 헤더로 실어보내는 방식으로 "누구인지"를 구분한다.
 * 나중에 실제 로그인(Supabase Auth 등)이 붙으면 이 파일은 지우고,
 * 그 자리에 실제 로그인된 사용자 id를 쓰면 된다.
 */
export function getTempUserId() {
  const STORAGE_KEY = "oneulmoyeo_temp_user_id";
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}