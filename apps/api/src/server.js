import { createConfiguredTeamFlowApp } from './runtime.js'

const port = Number.parseInt(process.env.PORT ?? '3000', 10)
const app = createConfiguredTeamFlowApp()

app.listen(port, '0.0.0.0', () => {
  console.log(`TeamFlow API listening on port ${port}`)
})
