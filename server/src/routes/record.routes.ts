import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { createRecord, getRecordsByMonth, getTodayRecord } from '../controllers/record.controller.js';
import { upload } from '../lib/upload.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { HttpError } from '../middleware/error.middleware.js';

export const recordRouter = Router();

recordRouter.use(authMiddleware);

function handleImageUpload(req: Request, res: Response, next: NextFunction) {
  upload.single('image')(req, res, (err: unknown) => {
    if (err) {
      const message = err instanceof Error ? err.message : '업로드에 실패했습니다.';
      next(new HttpError(400, message));
      return;
    }

    next();
  });
}

recordRouter.post('/', handleImageUpload, createRecord);
recordRouter.get('/today', getTodayRecord);
recordRouter.get('/', getRecordsByMonth);
