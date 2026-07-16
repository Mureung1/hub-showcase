import express from 'express';

import type { InsightCaptureResult } from '../src/entities/insight/model/insight_capture';
import type { ServerInsightCaptureService } from './insight_capture_service';

export type CreateAppOptions = {
  captureService?: ServerInsightCaptureService;
};

export function createApp({ captureService }: CreateAppOptions = {}) {
  const app = express();

  app.use(express.json({ limit: '8kb' }));

  app.get('/api/health', (_request, response) => {
    response.json({ ok: true });
  });

  app.post('/api/insights/capture', async (request, response) => {
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
  });

  return app;
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
