import "dotenv/config";
import { createApp } from "./app.js";

const port = Number(process.env.PORT) || 3000;
const app = createApp();

app.listen(port, () => {
  console.log(`SWIM API is running at http://localhost:${port}`);
});
