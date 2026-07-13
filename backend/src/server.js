import cors from "cors";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.all("/api/profiles", (_req, res) => {
  res.status(501).json({ error: "not implemented" });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`backend listening on port ${PORT}`);
});
