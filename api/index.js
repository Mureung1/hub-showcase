// Vercel 서버리스 진입점. server/의 Express 앱을 그대로 감싸서 노출한다.
// 배포 전 `npm run build:server`로 server/dist가 먼저 생성돼 있어야 한다.
import app from "../server/dist/app.js";

export default app;
