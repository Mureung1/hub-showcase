/**
 * Telemetry Routes
 * POST /api/telemetry — 파일럿 실사용 데이터 수집용 최소 이벤트 로깅 (pageview/error)
 */

import express, { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router: Router = express.Router();

const LOG_DIR = path.join('/data', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'events.log');

interface TelemetryEvent {
  type: 'pageview' | 'error';
  path?: string;
  message?: string;
  stack?: string;
  timestamp?: string;
}

router.post('/', (req: Request, res: Response) => {
  const event = req.body as TelemetryEvent;

  if (event.type !== 'pageview' && event.type !== 'error') {
    res.status(400).json({ error: 'type must be "pageview" or "error"' });
    return;
  }

  const record = { ...event, receivedAt: new Date().toISOString() };
  console.log(`[Telemetry] ${JSON.stringify(record)}`);

  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, `${JSON.stringify(record)}\n`);
  } catch (err) {
    console.error('[Telemetry] Failed to write log file:', err);
  }

  res.json({ success: true });
});

export default router;
