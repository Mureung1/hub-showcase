import "dotenv/config";
import cors from "cors";
import express from "express";
import profilesRouter from "./routes/profiles.js";
import postingsRouter from "./routes/drafts.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/profiles", profilesRouter);
app.use("/api/postings", postingsRouter);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`backend listening on port ${PORT}`);
});
