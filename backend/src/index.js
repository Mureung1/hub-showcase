import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js'
import authRoutes from './routes/auth.routes.js'
import usersRoutes from './routes/users.routes.js'
import subscriptionsRoutes from './routes/subscriptions.routes.js'

const app = express()
const port = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/subscriptions', subscriptionsRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

app.listen(port, () => {
  console.log(`Backend server listening on http://localhost:${port}`)
})
