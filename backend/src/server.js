import { env } from './env.js';
import app from './app.js';
import { checkAndSendExpiryPushes } from './push.js';

const PORT = env.PORT;
app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});

// 실서비스라면 매일 새벽 1회 cron으로 충분하지만, 이 서버는 데모용으로 재시작이 잦아
// 짧은 간격(1시간)으로 반복 체크한다 — checkAndSendExpiryPushes 내부의 sentToday가
// 하루 안에 중복 발송되는 것을 막아준다.
checkAndSendExpiryPushes().catch((err) => console.error('푸시 체크 실패:', err));
setInterval(() => {
  checkAndSendExpiryPushes().catch((err) => console.error('푸시 체크 실패:', err));
}, 60 * 60 * 1000);
