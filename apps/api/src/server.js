import { createApp } from './app.js'
import { createTeamFlowSupabaseClient } from './lib/supabaseClient.js'
import { createSupabaseTaskRepository } from './tasks/taskRepository.js'

const port = Number.parseInt(process.env.PORT ?? '3000', 10)
const supabase = createTeamFlowSupabaseClient()
const taskRepository = createSupabaseTaskRepository(supabase)
const app = createApp({ taskRepository })

app.listen(port, () => {
  console.log(`TeamFlow API listening on http://localhost:${port}`)
})
