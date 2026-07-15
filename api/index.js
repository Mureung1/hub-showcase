// Vercel 서버리스 함수 진입점.
//
// 실제 라우트 로직(/api/gemini, /api/places, /api/fooddb, 재시도/타임아웃/폴백 등)은
// 전부 server/proxy.js에 그대로 있다. 이 파일은 그 Express 앱을 그대로 가져와
// 핸들러로 다시 내보내기만 한다 — Vercel의 Node.js 런타임은 default export가 Express
// 앱(요청 핸들러 함수)이면 그걸 그대로 함수 핸들러로 사용한다.
//
// server/proxy.js는 process.env.VERCEL이 설정된 경우(Vercel이 자동으로 심어줌) app.listen()을
// 호출하지 않고 앱만 export하므로, 이 파일을 통해 임포트해도 별도 서버가 뜨지 않는다.
// 로컬 개발(npm run server)에서는 server/proxy.js가 직접 실행되어 지금처럼 listen한다.
export { default } from '../server/proxy.js'
