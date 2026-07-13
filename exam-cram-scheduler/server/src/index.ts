import "dotenv/config";
import express from "express";

const app = express();
const port = process.env.PORT ?? 4000;

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`server listening on http://localhost:${port}`);
});
