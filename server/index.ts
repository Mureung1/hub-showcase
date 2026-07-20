import { createOperatingApp } from './operating_app.js';

const port = Number(process.env.PORT ?? 3001);
const app = createOperatingApp();

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});
