import "dotenv/config";
import cors from "cors";
import express from "express";
import profilesRouter from "./routes/profiles.js";
import postingsRouter from "./routes/drafts.js";
import authRouter from "./routes/auth.js";
import { requireAuth } from "./middleware/requireAuth.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", requireAuth, authRouter);
app.use("/api/profiles", requireAuth, profilesRouter);
app.use("/api/postings", requireAuth, postingsRouter);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`backend listening on port ${PORT}`);
});
