import { createApp } from "../server/src/app.js";

// Vercel에서는 Express 앱 전체가 하나의 Node.js Function으로 실행된다.
// listen()은 호출하지 않고 앱 자체를 export해 서버리스 런타임에 위임한다.
export default createApp();
