import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { router } from './routes/index.js'
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.js'

export const app = express()

app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

app.use('/api', router)

app.use(notFoundHandler)
app.use(errorHandler)
