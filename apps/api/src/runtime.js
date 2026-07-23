import { createApp } from './app.js'
import { createSupabaseAuthVerifier } from './lib/auth.js'
import { readAllowedOrigins } from './lib/cors.js'
import { createTeamFlowSupabaseClient } from './lib/supabaseClient.js'
import {
  createSupabaseDemoRepository,
  createSupabaseTeamFlowRepository,
} from './teamflow/teamFlowRepository.js'

/**
 * Builds the production API without binding a port.
 *
 * Local development and hosted deployment share this composition root so
 * authentication, repositories, and Supabase project guards cannot drift.
 */
export function createConfiguredTeamFlowApp({ environment = process.env } = {}) {
  const publicSupabase = createTeamFlowSupabaseClient({ environment })
  const allowedOrigins = readAllowedOrigins(environment)
  const authVerifier = createSupabaseAuthVerifier(publicSupabase)
  const demoRepository = createSupabaseDemoRepository(publicSupabase)
  const repositoryFactory = ({ token, user }) => createSupabaseTeamFlowRepository(
    createTeamFlowSupabaseClient({ token, environment }),
    user,
  )

  return createApp({
    authVerifier,
    repositoryFactory,
    demoRepository,
    allowedOrigins,
  })
}
