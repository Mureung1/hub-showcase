import "dotenv/config";
import express from "express";

import repoRouter from "./routes/repo";
import analysisRouter from "./routes/analysis";
import stepsRouter from "./routes/steps";
import chatRouter from "./routes/chat";
import documentsRouter from "./routes/documents";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/repo", repoRouter);
app.use("/api/analysis", analysisRouter);
app.use("/api/steps", stepsRouter);
app.use("/api/chat", chatRouter);
app.use("/api/documents", documentsRouter);

app.listen(PORT, () => {
  console.log(`GameForge Agent API server listening on http://localhost:${PORT}`);
});
