import crypto from 'node:crypto';

import prisma from '../config/prisma.js';
import config from '../config/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('apiUsageService');

// 토큰 식별자 — 스키마 규칙상 토큰 원문 저장 금지라 SHA-256 해시 앞 12자리만 쓴다
// (같은 토큰이면 항상 같은 키가 나와 일별 집계가 이어지고, 해시에서 원문 복원은 불가)
const tokenKey = config.githubToken
    ? crypto.createHash('sha256').update(config.githubToken).digest('hex').slice(0, 12)
    : 'no-token';

// 오늘 날짜(UTC 자정) — api_usage.date가 @db.Date라 시간부를 버린 값으로 맞춘다
function todayUtc() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// GitHub API 호출 1건을 일별 집계에 기록 (tokenKey+date 행의 count 증가)
// 집계는 부가 기능이므로 실패해도 throw하지 않는다 — 본 요청(분석)이 이것 때문에 죽으면 안 됨
export async function recordGithubCall() {
    const date = todayUtc();
    try {
        await prisma.apiUsage.upsert({
            where: { tokenKey_date: { tokenKey, date } },
            update: { count: { increment: 1 } },
            create: { tokenKey, date, count: 1 },
        });
    } catch (error) {
        logger.warn('GitHub 호출량 기록 실패:', { error: error.message, tokenKey, date });
    }
}
