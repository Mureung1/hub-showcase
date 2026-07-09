// Express 진입점. 다음주에 여기서 라우트를 연결한다.
import express from "express";
import cors from "cors";
import "dotenv/config";
import postings from "./routes/postings.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/postings", postings);

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`server on :${port}`));
