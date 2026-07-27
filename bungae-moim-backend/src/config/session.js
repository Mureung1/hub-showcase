const session = require('express-session');

module.exports = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    // 'auto'는 연결이 안전할 때만 Secure를 붙인다(express-session이 지원하는 값).
    // true로 고정하면 프록시 뒤에서 trust proxy가 어긋났을 때 쿠키가 아예 안 나가 로그인이 통째로 죽는다.
    // 'auto'는 그 경우에도 Secure 없이 설정돼 동작은 유지된다. 로컬(http)·테스트에도 영향이 없다.
    secure: 'auto',
    // 지금까지는 maxAge가 없어 브라우저를 닫으면 로그아웃됐다. 배포 후에는 7일 유지한다.
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
});
