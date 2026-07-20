import { createClient } from '@supabase/supabase-js'

const TEAMFLOW_PROJECT_REF = 'lmmeuoeuiouyowpthxwg'
const TIMEBOX_FORBIDDEN_REF = 'vimywtpiqsixlfiegpdd'

function requireEnvironmentValue(environment, name) {
  const value = environment[name]?.trim()

  if (!value) {
    throw new Error(`${name} 환경변수가 필요합니다.`)
  }

  return value
}

export function readTeamFlowSupabaseConfig(environment = process.env) {
  const url = requireEnvironmentValue(environment, 'TEAMFLOW_SUPABASE_URL')
  const secretKey = requireEnvironmentValue(environment, 'TEAMFLOW_SUPABASE_SECRET_KEY')

  let hostname
  try {
    hostname = new URL(url).hostname
  } catch {
    throw new Error('TEAMFLOW_SUPABASE_URL이 올바른 URL이 아닙니다.')
  }

  if (hostname.includes(TIMEBOX_FORBIDDEN_REF)) {
    throw new Error('TimeBox Supabase 프로젝트는 TeamFlow API에서 사용할 수 없습니다.')
  }

  if (hostname !== `${TEAMFLOW_PROJECT_REF}.supabase.co`) {
    throw new Error(`TEAMFLOW_SUPABASE_URL은 TeamFlow 프로젝트(${TEAMFLOW_PROJECT_REF})여야 합니다.`)
  }

  if (!secretKey.startsWith('sb_secret_')) {
    throw new Error('TEAMFLOW_SUPABASE_SECRET_KEY에는 TeamFlow의 sb_secret_ 키를 사용해야 합니다.')
  }

  return { url, secretKey }
}

export function createTeamFlowSupabaseClient(environment = process.env) {
  const { url, secretKey } = readTeamFlowSupabaseConfig(environment)

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  })
}
