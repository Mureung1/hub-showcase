import { AppError } from '../../utils/errors.js';

// 데모 범위라 계정별 요청 시각을 메모리에 들고 슬라이딩 윈도우로 검사한다.
// (express-session도 지금 MemoryStore이므로 서버 재시작 시 함께 초기화되는 게 자연스럽다.)
const PER_MINUTE = Number(process.env.CHAT_RATE_PER_MINUTE) || 3;
const PER_HOUR = Number(process.env.CHAT_RATE_PER_HOUR) || 10;

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

// userId -> 최근 1시간 내 요청 시각(ms) 배열. 사용자당 최대 PER_HOUR개로 유지된다.
const hits = new Map();

export function chatRateLimit(req, res, next) {
  const userId = req.session?.userId;
  if (!userId) {
    // requireAuth 뒤에 붙는 미들웨어라 정상 흐름에선 도달하지 않는다.
    return next(new AppError(401, 'not_authenticated', '로그인이 필요합니다.'));
  }

  const now = Date.now();
  // 1시간 지난 기록은 버려서 배열이 무한정 커지지 않게 한다.
  const recent = (hits.get(userId) || []).filter((t) => now - t < HOUR);

  const inLastMinute = recent.filter((t) => now - t < MINUTE);

  if (inLastMinute.length >= PER_MINUTE) {
    return next(rejected(recent, inLastMinute[0] + MINUTE, now, res, `분당 ${PER_MINUTE}회`));
  }
  if (recent.length >= PER_HOUR) {
    return next(rejected(recent, recent[0] + HOUR, now, res, `시간당 ${PER_HOUR}회`));
  }

  recent.push(now);
  hits.set(userId, recent);
  next();
}

function rejected(recent, freeAt, now, res, limitLabel) {
  const retryAfter = Math.max(1, Math.ceil((freeAt - now) / 1000));
  res.set('Retry-After', String(retryAfter));
  return new AppError(
    429,
    'rate_limited',
    `요청 한도(${limitLabel})를 초과했습니다. ${retryAfter}초 후 다시 시도해주세요.`
  );
}
