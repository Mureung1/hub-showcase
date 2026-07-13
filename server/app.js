import express from 'express'
import naverRouter from './routes/naver.js'
import recipesRouter from './routes/recipes.js'

const app = express()

app.use('/api/naver', naverRouter)
app.use('/api/recipes', recipesRouter)

export default app
