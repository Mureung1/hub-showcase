const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Express 서버 실행 중");
});

app.get("/api/stores", (req, res) => {
  res.json([
    { id: 1, name: "수플레 카페 A", mood: 9, price: 7 },
    { id: 2, name: "조용한 카페 B", mood: 8, price: 8 },
  ]);
});

app.listen(PORT, () => {
  console.log(`서버 실행: http://localhost:${PORT}`);
});