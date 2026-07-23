import 'dotenv/config'
import app from './app.js'
import { startExpiryScheduler } from './services/expiryService.js'

const port = process.env.PORT || 4000

app.listen(port, () => {
  console.log(`server listening on http://localhost:${port}`)
  startExpiryScheduler()
})
