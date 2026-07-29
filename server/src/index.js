try {
  process.loadEnvFile();
} catch {
  // .env가 없으면 기본값으로 동작한다 (.env.example 참고)
}

// 정적 import는 loadEnvFile()보다 먼저 평가되어 db/index.js가 .env 반영 전
// process.env.DB_PATH를 읽게 된다. 동적 import로 순서를 강제한다.
const { createApp } = await import("./app.js");
const { ensureImageBucketExists } = await import("./services/imageStorage.js");

const port = process.env.PORT ?? 4000;
const app = createApp();

await ensureImageBucketExists();

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
