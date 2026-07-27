import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { routineRouter } from './routes/routine.js'
import { onboardingRouter, routineDayRouter } from './routes/onboarding.js'
import { painReportsRouter } from './routes/painReports.js'
import { recordsRouter } from './routes/records.js'

const app = express()
const port = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api', routineRouter)
app.use('/api', onboardingRouter)
app.use('/api', routineDayRouter)
app.use('/api', painReportsRouter)
app.use('/api', recordsRouter)

app.listen(port, () => {
  console.log(`server listening on http://localhost:${port}`)
})
