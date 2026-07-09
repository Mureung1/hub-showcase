// Vercel 진입점. Express 앱을 그대로 export하면 Vercel Node 런타임이 알아서 요청을 넘겨준다
// (serverless-http 같은 어댑터 불필요, app.listen()도 여기선 호출하지 않는다).
import app from '../server/app.js'

export default app
