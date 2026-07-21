import type { NextFunction, Request, Response } from 'express';
import { pickChallengeTopic } from '../lib/challenge-seed.js';
import { getKstChallengeDateString } from '../lib/kst-date.js';
import { prisma } from '../lib/prisma.js';

export async function getTodayChallenge(_req: Request, res: Response, next: NextFunction) {
  try {
    const date = getKstChallengeDateString();
    const topic = pickChallengeTopic(date);

    const challenge = await prisma.challenge.upsert({
      where: { date },
      create: { date, topic },
      update: {},
    });

    res.json({ date: challenge.date, topic: challenge.topic });
  } catch (err) {
    next(err);
  }
}
