import cors from "cors";
import "dotenv/config";
import express from "express";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { healthRouter } from "./routes/health.js";

const app = express();
const port = Number(process.env.PORT ?? 3000);
const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5173";

app.use(cors({ origin: corsOrigin }));
app.use(express.json());
app.use(requestLogger);

app.use("/api/health", healthRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`PlaceSync 서버가 http://localhost:${port} 에서 실행 중입니다.`);
});
