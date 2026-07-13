import "dotenv/config";
import app from "./app.js";

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// 실제서버 실행