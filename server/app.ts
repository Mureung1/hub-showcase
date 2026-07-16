import express, {
  type ErrorRequestHandler,
  type RequestHandler,
} from 'express';

import type { InsightCaptureResult } from '../src/entities/insight/model/insight_capture';
import type { ServerInsightCaptureService } from './insight_capture_service';

export type CreateAppOptions = {
  captureService?: ServerInsightCaptureService;
  logger?: Pick<Console, 'error'>;
};

const captureJsonParser = express.json({ limit: '8kb' });

const parseCaptureJson: RequestHandler = (request, response, next) => {
  captureJsonParser(request, response, (error) => {
    if (error) {
      response.status(400).json({ ok: false, reason: 'invalid-request' });
      return;
    }

    next();
  });
};

export function createApp({
  captureService,
  logger = console,
}: CreateAppOptions = {}) {
  const app = express();

  app.get('/api/health', (_request, response) => {
    response.json({ ok: true });
  });

  app.post(
    '/api/insights/capture',
    parseCaptureJson,
    async (request, response) => {
      const accessToken = getBearerToken(request.header('authorization'));

      if (!accessToken) {
        response.status(401).json({ ok: false, reason: 'permission-denied' });
        return;
      }

      if (!captureService) {
        response.status(503).json({ ok: false, reason: 'write-failed' });
        return;
      }

      const result = await captureService.capture(accessToken, request.body);

      response.status(getCaptureStatus(result)).json(result);
    }
  );

  app.use(createCaptureErrorHandler(logger));

  return app;
}

function createCaptureErrorHandler(
  logger: Pick<Console, 'error'>
): ErrorRequestHandler {
  return (error, request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }

    try {
      logger.error('요청 처리 중 예외 발생', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
        method: request.method,
        path: request.path,
      });
    } catch {
      // 로거 장애가 안전한 오류 응답을 다시 깨뜨리지 않도록 격리한다.
    }
    response.status(503).json({ ok: false, reason: 'write-failed' });
  };
}

function getBearerToken(authorization: string | undefined) {
  const match = /^Bearer ([^\s]+)$/i.exec(authorization ?? '');

  return match?.[1];
}

function getCaptureStatus(result: InsightCaptureResult) {
  if (result.ok) {
    return 200;
  }

  if (result.reason === 'permission-denied') {
    return 401;
  }

  if (
    result.reason === 'invalid-request' ||
    result.reason === 'invalid-url' ||
    result.reason === 'unsupported-protocol'
  ) {
    return 400;
  }

  return 503;
}
