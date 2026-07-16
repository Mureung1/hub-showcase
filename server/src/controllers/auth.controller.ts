import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { signToken } from '../lib/jwt.js';
import { comparePassword, hashPassword } from '../lib/password.js';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.middleware.js';

const signupSchema = z.object({
  name: z.string().min(1),
  nickname: z.string().min(1),
  email: z.string().email(),
  password: z
    .string()
    .min(8, '비밀번호는 8자 이상이어야 합니다.')
    .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, '비밀번호는 영문과 숫자를 포함해야 합니다.'),
});

export async function signup(req: Request, res: Response, next: NextFunction) {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid request' });
    return;
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) {
      throw new HttpError(409, '이미 가입된 이메일입니다.');
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        passwordHash,
        name: parsed.data.name,
        nickname: parsed.data.nickname,
      },
    });

    const token = signToken({ userId: user.id });
    res.status(201).json({ token });
  } catch (err) {
    next(err);
  }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function login(req: Request, res: Response, next: NextFunction) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid request' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user || !(await comparePassword(parsed.data.password, user.passwordHash))) {
      throw new HttpError(401, '이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const token = signToken({ userId: user.id });
    res.status(200).json({ token });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      throw new HttpError(401, '사용자를 찾을 수 없습니다.');
    }

    res.json({ id: user.id, email: user.email, name: user.name, nickname: user.nickname });
  } catch (err) {
    next(err);
  }
}
