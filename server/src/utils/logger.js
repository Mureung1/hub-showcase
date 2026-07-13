import winston from 'winston';

const { combine, timestamp, printf } = winston.format;

// "시각 [모듈] 레벨: 메시지 {컨텍스트}" 형태의 구조적 로그 포맷
const logFormat = printf(({ level, message, timestamp: time, module: moduleName, ...meta }) => {
    const metaText = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `${time} [${moduleName}] ${level}: ${message}${metaText}`;
});

// 모듈별 로거 생성 (conventions.md 로깅 규칙)
export function createLogger(moduleName) {
    return winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
        defaultMeta: { module: moduleName },
        transports: [new winston.transports.Console()],
    });
}
