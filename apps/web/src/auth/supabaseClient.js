import { createClient } from '@supabase/supabase-js'

const TEAMFLOW_PROJECT_REF = 'lmmeuoeuiouyowpthxwg'
const TIMEBOX_FORBIDDEN_REF = 'vimywtpiqsixlfiegpdd'

export function readBrowserSupabaseConfig(environment = import.meta.env) {
  const url = environment.VITE_TEAMFLOW_SUPABASE_URL?.trim()
  const publishableKey = environment.VITE_TEAMFLOW_SUPABASE_PUBLISHABLE_KEY?.trim()

  if (!url || !publishableKey) {
    throw new Error('TeamFlow 로그인 환경변수가 설정되지 않았습니다.')
  }

  let hostname
  try {
    hostname = new URL(url).hostname
  } catch {
    throw new Error('VITE_TEAMFLOW_SUPABASE_URL이 올바른 URL이 아닙니다.')
  }

  if (hostname.includes(TIMEBOX_FORBIDDEN_REF)) {
    throw new Error('TimeBox Supabase 프로젝트는 TeamFlow에서 사용할 수 없습니다.')
  }

  if (hostname !== `${TEAMFLOW_PROJECT_REF}.supabase.co`) {
    throw new Error('TeamFlow 전용 Supabase URL을 사용해야 합니다.')
  }

  if (!publishableKey.startsWith('sb_publishable_')) {
    throw new Error('브라우저에는 TeamFlow publishable key만 사용할 수 있습니다.')
  }

  return { url, publishableKey }
}

export function createBrowserSupabaseClient(environment = import.meta.env) {
  const { url, publishableKey } = readBrowserSupabaseConfig(environment)
  return createClient(url, publishableKey, {
    auth: {
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  })
}

export function resolveBrowserSupabaseClient(environment = import.meta.env) {
  try {
    return { client: createBrowserSupabaseClient(environment), configError: '' }
  } catch (error) {
    return {
      client: null,
      configError: error instanceof Error ? error.message : 'TeamFlow 로그인 설정을 확인해 주세요.',
    }
  }
}
