import { createApp } from './app.js'
import { readAiRuntimeConfig } from './lib/aiConfig.js'
import { createAiCredentialCipher } from './lib/aiCredentialCipher.js'
import { createSupabaseAuthVerifier } from './lib/auth.js'
import { readAllowedOrigins } from './lib/cors.js'
import { createTeamFlowSupabaseClient } from './lib/supabaseClient.js'
import {
  createSupabaseDemoRepository,
  createSupabaseTeamFlowRepository,
} from './teamflow/teamFlowRepository.js'
import { createGeminiClient } from './teamflow/geminiClient.js'

/**
 * Builds the production API without binding a port.
 *
 * Local development and hosted deployment share this composition root so
 * authentication, repositories, and Supabase project guards cannot drift.
 */
export function createConfiguredTeamFlowApp({
  environment = process.env,
  fetchImpl = globalThis.fetch,
} = {}) {
  const publicSupabase = createTeamFlowSupabaseClient({ environment })
  const allowedOrigins = readAllowedOrigins(environment)
  const aiRuntime = readAiRuntimeConfig(environment)
  const credentialCipher = aiRuntime.encryptionKey
    ? createAiCredentialCipher(aiRuntime.encryptionKey)
    : null
  const aiProvider = aiRuntime.credentialRequired
    ? createGeminiClient({
        fetchImpl,
        model: aiRuntime.model,
        timeoutMs: aiRuntime.timeoutMs,
      })
    : null
  const authVerifier = createSupabaseAuthVerifier(publicSupabase)
  const demoRepository = createSupabaseDemoRepository(publicSupabase)
  const repositoryFactory = ({ token, user }) => createSupabaseTeamFlowRepository(
    createTeamFlowSupabaseClient({ token, environment }),
    user,
    {
      aiRuntime,
      credentialCipher,
      aiProvider,
    },
  )

  return createApp({
    authVerifier,
    repositoryFactory,
    demoRepository,
    allowedOrigins,
  })
}
