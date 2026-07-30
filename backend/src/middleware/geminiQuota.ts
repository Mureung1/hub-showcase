import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { createDailyQuota } from '../lib/dailyQuota';

// Gemini를 호출하는 두 엔드포인트(/analyze, /refine)에만 붙이는 방어선.
// 공개 URL에 올라가는 데모라 "누가 얼마나 쓰든 하루 총합 N회"가 실제 비용을 정하는
// 유일한 확실한 상한이다(X-Forwarded-For는 위조 가능해서 IP 제한만으론 못 지킨다).
// IP당 분당 제한은 같은 사람의 연타(더블클릭, 새로고침 폭주)만 완화하는 보조 장치다.

const DAILY_MAX = Number(process.env.GEMINI_DAILY_QUOTA) || 50;
const dailyQuota = createDailyQuota({ max: DAILY_MAX });

// Render/Vercel 뒤에 있으므로 req.ip가 X-Forwarded-For를 읽으려면
// server.ts에서 app.set('trust proxy', ...)가 먼저 설정돼 있어야 한다.
export const perIpBurstLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.' },
});

export function dailyQuotaGuard(_req: Request, res: Response, next: NextFunction): void {
  const result = dailyQuota.consume();
  if (!result.allowed) {
    res.status(429).json({
      error: '오늘 사용 가능한 분석 횟수를 모두 사용했습니다. 내일 다시 시도해주세요.',
    });
    return;
  }
  next();
}

export function getDailyQuotaUsage() {
  return dailyQuota.usage();
}
