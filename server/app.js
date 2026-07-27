import express from 'express'
import naverRouter from './routes/naver.js'
import recipesRouter from './routes/recipes.js'
import youtubeRouter from './routes/youtube.js'

const app = express()

app.use('/api/naver', naverRouter)
app.use('/api/recipes', recipesRouter)
app.use('/api/youtube', youtubeRouter)

export default app
