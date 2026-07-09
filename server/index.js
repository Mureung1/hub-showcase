import express from 'express'
import cors from 'cors'
import checkinsRouter from './routes/checkins.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/checkins', checkinsRouter)

app.listen(PORT, () => {
  console.log(`server listening on http://localhost:${PORT}`)
})
