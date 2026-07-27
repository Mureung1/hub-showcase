import { randomBytes } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { getKstChallengeDateString } from '../lib/kst-date.js';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.middleware.js';

const MAX_ROOM_MEMBERS = 6;

function generateInviteCode(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

const createRoomSchema = z.object({
  name: z.string().min(1).max(50),
});

export async function createRoom(req: Request, res: Response, next: NextFunction) {
  const parsed = createRoomSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid request' });
    return;
  }

  try {
    const userId = req.user!.id;

    const room = await prisma.room.create({
      data: {
        name: parsed.data.name,
        inviteCode: generateInviteCode(),
        members: { create: { userId } },
      },
    });

    res.status(201).json(room);
  } catch (err) {
    next(err);
  }
}

const joinRoomSchema = z.object({
  inviteCode: z.string().min(1),
});

export async function joinRoom(req: Request, res: Response, next: NextFunction) {
  const parsed = joinRoomSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid request' });
    return;
  }

  try {
    const userId = req.user!.id;
    const room = await prisma.room.findUnique({
      where: { inviteCode: parsed.data.inviteCode },
      include: { members: true },
    });

    if (!room) {
      throw new HttpError(404, '초대코드에 해당하는 방을 찾을 수 없습니다.');
    }

    if (room.members.some((member) => member.userId === userId)) {
      throw new HttpError(409, '이미 참여한 방입니다.');
    }

    if (room.members.length >= MAX_ROOM_MEMBERS) {
      throw new HttpError(403, '방 인원이 가득 찼습니다.');
    }

    await prisma.roomMember.create({ data: { roomId: room.id, userId } });

    res.status(201).json({ id: room.id, name: room.name });
  } catch (err) {
    next(err);
  }
}

export async function getMyRooms(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;

    const memberships = await prisma.roomMember.findMany({
      where: { userId },
      include: { room: { include: { _count: { select: { members: true } } } } },
    });

    const rooms = memberships.map((membership) => ({
      id: membership.room.id,
      name: membership.room.name,
      inviteCode: membership.room.inviteCode,
      memberCount: membership.room._count.members,
    }));

    res.json(rooms);
  } catch (err) {
    next(err);
  }
}

export async function getRoomToday(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const roomId = req.params.id;

    const membership = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });

    if (!membership) {
      throw new HttpError(403, '방 멤버만 조회할 수 있습니다.');
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { members: { include: { user: true } } },
    });

    if (!room) {
      throw new HttpError(404, '방을 찾을 수 없습니다.');
    }

    const date = getKstChallengeDateString();

    const members = await Promise.all(
      room.members.map(async (member) => {
        const record = await prisma.record.findUnique({
          where: { userId_date: { userId: member.userId, date } },
        });

        if (!record) {
          return { userId: member.userId, nickname: member.user.nickname, recorded: false };
        }

        return {
          userId: member.userId,
          nickname: member.user.nickname,
          recorded: true,
          imageUrl: record.imageUrl,
          memo: record.memo,
        };
      }),
    );

    res.json({ roomId: room.id, roomName: room.name, date, members });
  } catch (err) {
    next(err);
  }
}
