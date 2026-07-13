import { createApp } from "./app";
import { env } from "./common/config/env";

const app = createApp();

app.listen(env.port, () => {
  console.log(`Albanote API server is running on port ${env.port}.`);
});
