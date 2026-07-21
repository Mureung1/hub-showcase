import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { getKstChallengeDateString } from '../lib/kst-date.js';
import { prisma } from '../lib/prisma.js';
import { UPLOAD_URL_PREFIX } from '../lib/upload.js';
import { HttpError } from '../middleware/error.middleware.js';

const createRecordSchema = z.object({
  memo: z.string().min(1).max(200),
});

export async function createRecord(req: Request, res: Response, next: NextFunction) {
  const parsed = createRecordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid request' });
    return;
  }

  if (!req.file) {
    res.status(400).json({ message: '이미지 파일이 필요합니다.' });
    return;
  }

  try {
    const date = getKstChallengeDateString();
    const userId = req.user!.id;

    const existing = await prisma.record.findUnique({ where: { userId_date: { userId, date } } });
    if (existing) {
      throw new HttpError(409, '오늘은 이미 기록을 남겼습니다.');
    }

    const record = await prisma.record.create({
      data: {
        userId,
        date,
        imageUrl: `${UPLOAD_URL_PREFIX}/${req.file.filename}`,
        memo: parsed.data.memo,
      },
    });

    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
}

export async function getTodayRecord(req: Request, res: Response, next: NextFunction) {
  try {
    const date = getKstChallengeDateString();
    const userId = req.user!.id;

    const record = await prisma.record.findUnique({ where: { userId_date: { userId, date } } });
    res.json({ recorded: Boolean(record), record });
  } catch (err) {
    next(err);
  }
}
