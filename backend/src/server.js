import "dotenv/config";
import cors from "cors";
import express from "express";
import profilesRouter from "./routes/profiles.js";
import postingsRouter from "./routes/drafts.js";
import authRouter from "./routes/auth.js";
import { requireAuth } from "./middleware/requireAuth.js";

const app = express();

const allowedOrigins = ["http://localhost:5173", "https://hub-two-rosy.vercel.app"];

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", requireAuth, authRouter);
app.use("/api/profiles", requireAuth, profilesRouter);
app.use("/api/postings", requireAuth, postingsRouter);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`backend listening on port ${PORT}`);
});
