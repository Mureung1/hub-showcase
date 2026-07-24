export function isDemoMode(env = process.env) {
  if (env.DEMO_MODE === 'true') {
    return true
  }

  return !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY
}
