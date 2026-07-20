// Supabase 클라이언트 싱글턴.
// 로그인/회원가입 호출과 세션(로그인 상태 유지) 관리에 사용한다.
// 모듈 스코프에서 한 번만 생성해 export — 앱 전체가 같은 클라이언트를 공유한다.
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// .env에 값이 아직 없으면 createClient가 그 자리에서 예외를 던져 앱 전체가 하얗게 뜬다.
// 형식만 맞는 더미 값으로 폴백해서, 값이 없어도 화면은 뜨고 실제 로그인 시도할 때만 자연스럽게 실패하게 한다.
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY가 설정되지 않았어요. frontend/.env에 값을 넣어주세요. ' +
      '값이 없는 동안은 화면은 뜨지만 로그인/회원가입은 동작하지 않습니다.',
  )
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder-anon-key')
