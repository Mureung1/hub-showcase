import { createApp } from './app.js'
import { createSupabaseAuthVerifier } from './lib/auth.js'
import { createTeamFlowSupabaseClient } from './lib/supabaseClient.js'
import { createSupabaseDemoRepository, createSupabaseTeamFlowRepository } from './teamflow/teamFlowRepository.js'

const port = Number.parseInt(process.env.PORT ?? '3000', 10)
const publicSupabase = createTeamFlowSupabaseClient()
const authVerifier = createSupabaseAuthVerifier(publicSupabase)
const demoRepository = createSupabaseDemoRepository(publicSupabase)
const repositoryFactory = ({ token, user }) => createSupabaseTeamFlowRepository(
  createTeamFlowSupabaseClient({ token }),
  user,
)
const app = createApp({ authVerifier, repositoryFactory, demoRepository })

app.listen(port, () => {
  console.log(`TeamFlow API listening on http://localhost:${port}`)
})
