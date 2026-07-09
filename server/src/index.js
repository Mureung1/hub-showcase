import "dotenv/config"
import express from "express"
import cors from "cors"
import briefingRouter from "./routes/briefing.js"
import sentencesRouter from "./routes/sentences.js"
import termsRouter from "./routes/terms.js"

const app = express()
const PORT = process.env.PORT ?? 4000

app.use(cors())
app.use(express.json())

app.use("/api/briefing", briefingRouter)
app.use("/api/sentences", sentencesRouter)
app.use("/api/terms", termsRouter)

// Every route responds with { success, data } or { success: false, error }.
// Anything else (a thrown error that skips a route's own try/catch) lands here.
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ success: false, error: "Internal server error" })
})

app.listen(PORT, () => {
  console.log(`server listening on http://localhost:${PORT}`)
})
