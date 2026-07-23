import app from "./app.js";

const port = Number(process.env.PORT ?? 3000);

app.listen(port, "127.0.0.1", () => {
  console.log(`Photo Navigation API: http://127.0.0.1:${port}`);
});
