import "dotenv/config"
import express from "express"
import cors from "cors"
import dashboardRouter from "./routes/dashboard.js"
import articleRouter from "./routes/article.js"
import decisionsRouter from "./routes/decisions.js"
import vocabularyRouter from "./routes/vocabulary.js"
import articleReadsRouter from "./routes/articleReads.js"

const app = express()
const PORT = process.env.PORT ?? 4000

app.use(cors())
app.use(express.json())

// 배포 플랫폼(Render 등)의 상태 확인용 — 외부 의존성 없이 프로세스 생존만 확인
app.get("/api/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok" } })
})

app.use("/api/dashboard", dashboardRouter)
app.use("/api/article", articleRouter)
app.use("/api/decisions", decisionsRouter)
app.use("/api/vocabulary", vocabularyRouter)
app.use("/api/article-reads", articleReadsRouter)

// Every route responds with { success, data } or { success: false, error }.
// Anything else (a thrown error that skips a route's own try/catch) lands here.
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ success: false, error: "Internal server error" })
})

app.listen(PORT, () => {
  console.log(`server listening on http://localhost:${PORT}`)
})
