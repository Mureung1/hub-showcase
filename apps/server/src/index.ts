import express from "express";

const app = express();
const PORT = 4000;

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "weatherpilot-server" });
});

app.listen(PORT, () => {
  console.log(`server on http://localhost:${PORT}`);
});