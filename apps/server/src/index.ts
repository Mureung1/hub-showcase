import express from "express";
import { weatherRouter } from "./routes/weather";
import { salesRouter } from "./routes/sales";
import { proposalRouter } from "./routes/proposal";

const app = express();
const PORT = 4000;

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "weatherpilot-server" });
});

app.use("/weather", weatherRouter);
app.use("/sales", salesRouter);
app.use("/proposal", proposalRouter);

app.listen(PORT, () => {
  console.log(`server on http://localhost:${PORT}`);
});
