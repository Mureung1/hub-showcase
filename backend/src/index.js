import "dotenv/config";
import cors from "cors";
import express from "express";

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "core-loop-builder-backend" });
});

app.listen(port, () => {
  console.log(`core-loop-builder-backend listening on http://localhost:${port}`);
});
