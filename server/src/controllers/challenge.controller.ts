import type { NextFunction, Request, Response } from 'express';
import { pickChallengeTopic } from '../lib/challenge-seed.js';
import { getKstChallengeDateString } from '../lib/kst-date.js';
import { prisma } from '../lib/prisma.js';

export async function getTodayChallenge(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const date = getKstChallengeDateString();

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const topic = pickChallengeTopic(`${userId}-${date}`, user?.preferredCategory);

    const challenge = await prisma.challenge.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, topic },
      update: {},
    });

    res.json({ date: challenge.date, topic: challenge.topic });
  } catch (err) {
    next(err);
  }
}
