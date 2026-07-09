import express from 'express'
import naverRouter from './routes/naver.js'

const app = express()

app.use('/api/naver', naverRouter)

export default app
