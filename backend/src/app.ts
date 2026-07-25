import cors from 'cors'
import express from 'express'
import morgan from 'morgan'
import { errorHandler } from './middlewares/errorHandler'
import { router } from './routes'

export const app = express()

app.use(cors())
app.use(morgan('dev'))
app.use(express.json())

app.use('/api', router)

app.use(errorHandler)
