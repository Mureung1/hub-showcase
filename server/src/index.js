import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import lettersRouter from './routes/letters.js'

dotenv.config()
const app = express()

app.use(cors({ origin: process.env.CLIENT_ORIGIN }))
app.use(express.json())
app.use('/api/letters', lettersRouter)

app.listen(process.env.PORT, () => console.log(`서버 실행 중: ${process.env.PORT}`))
