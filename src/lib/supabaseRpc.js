// Supabase RPC 호출 공용 래퍼 — **인증 만료 레이스 1회 자동 복구**.
//
// 증상: 데모 전날 실측. 데스크톱 웹·모바일 크롬 양쪽에서 리더보드가 간헐적으로 안 뜨고,
// "새로고침하거나 조금 기다리면" 정상으로 돌아왔다.
//
// 원인: supabase-js는 액세스 토큰을 메모리에 들고 있고 만료되면 리프레시 토큰으로 갱신한다.
// 페이지를 오래 열어뒀거나(탭 백그라운드) 저장된 토큰이 이미 만료된 상태로 새로 열면, **갱신이
// 끝나기 전에 나간 요청**이 401(JWT expired)을 받는다. 이 앱의 RPC 호출부들은 그 오류를 그대로
// 에러 화면으로 바꾸고 재시도 수단이 없어서, 사용자는 새로고침 말고는 복구할 방법이 없었다.
//
// 여기서 한 번만 복구한다: 인증류 오류면 `supabase.auth.getSession()`을 부른다 — v2에서 이 호출은
// 만료된 세션을 **갱신까지 하고** 돌아오므로, 그 뒤 같은 RPC를 다시 치면 성공한다.
//
// ⚠️ 재시도는 정확히 1회다. 무한 재시도는 세션이 진짜로 끝난 사용자(로그아웃·계정 삭제)를 영원히
// 매달아두고 요청만 쌓는다 — 그 경우는 오류를 그대로 올려서 화면이 재시도 버튼을 보여주게 한다.
// ⚠️ 인증과 무관한 오류(함수 없음, 권한 정책, 네트워크)는 재시도하지 않는다. 같은 결과를 두 번
// 기다리게 만들 뿐이고, "SQL 함수를 아직 실행 안 했다" 같은 진짜 원인을 늦게 알게 된다.
import { supabase } from './supabase.js'

// PostgREST/GoTrue가 만료·무효 토큰에 붙이는 신호들. 코드 체계가 통일돼 있지 않아 메시지도 함께 본다.
function isAuthError(error) {
  if (!error) return false
  if (error.status === 401 || error.status === 403) return true
  if (error.code === 'PGRST301' || error.code === '42501') return true
  const message = String(error.message || '').toLowerCase()
  return message.includes('jwt') || message.includes('token') || message.includes('unauthorized')
}

// name: RPC 함수명, params: 인자(선택).
// 반환: supabase.rpc와 같은 { data, error } — 호출부가 기존 처리 방식을 그대로 쓸 수 있게 한다.
export async function rpcWithAuthRetry(name, params) {
  // params가 없으면 인자도 넘기지 않는다 — supabase.rpc(name, undefined)로 부르면 동작은 같지만
  // 호출 시그니처가 달라져, 이 래퍼로 갈아탄 것만으로 기존 호출부의 테스트가 깨진다(실제로 깨졌다).
  const args = params === undefined ? [name] : [name, params]

  const first = await supabase.rpc(...args)
  if (!first.error || !isAuthError(first.error)) return first

  try {
    // 만료됐으면 여기서 갱신된다. 실패하면(리프레시 토큰도 죽음) 원래 오류를 그대로 돌려준다.
    const { data, error } = await supabase.auth.getSession()
    if (error || !data?.session) return first
  } catch {
    return first
  }

  return supabase.rpc(...args)
}

export const _isAuthError = isAuthError
