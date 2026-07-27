import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const UPLOAD_DIR = path.resolve(import.meta.dirname, '../uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function makeSolidPng(size: number, r: number, g: number, b: number): Buffer {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 2;

  const rowLength = 1 + size * 3;
  const raw = Buffer.alloc(rowLength * size);
  for (let y = 0; y < size; y += 1) {
    const rowStart = y * rowLength;
    for (let x = 0; x < size; x += 1) {
      const px = rowStart + 1 + x * 3;
      raw[px] = r;
      raw[px + 1] = g;
      raw[px + 2] = b;
    }
  }

  const idatData = zlib.deflateSync(raw);
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdrData),
    pngChunk('IDAT', idatData),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function saveImage(r: number, g: number, b: number): string {
  const filename = `${randomUUID()}.png`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), makeSolidPng(160, r, g, b));
  return `/uploads/${filename}`;
}

function toKstDateString(daysAgo: number): string {
  const now = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

const MEMOS = [
  '오늘 하늘이 유난히 맑았다.',
  '퇴근길에 본 노을이 예뻤어요.',
  '평소보다 여유롭게 마신 커피 한 잔.',
  '새로 산 신발 첫 착용.',
  '책상 정리하다 발견한 옛날 사진.',
  '창밖으로 비가 내리는 풍경.',
  '점심에 먹은 떡볶이.',
  '손 닿는 곳에 늘 있는 다이어리.',
];

async function main() {
  const passwordHash = await bcrypt.hash('demo1234', 10);

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: { email: 'demo@example.com', passwordHash, name: '데모유저', nickname: '데모' },
  });

  const friend = await prisma.user.upsert({
    where: { email: 'demo-friend@example.com' },
    update: {},
    create: { email: 'demo-friend@example.com', passwordHash, name: '데모친구', nickname: '친구' },
  });

  // 오늘을 뺀 최근 7일치 기록 — 캘린더를 채워두고, 오늘은 라이브 시연용으로 비워둠
  for (let i = 1; i <= 7; i += 1) {
    const date = toKstDateString(i);
    const imageUrl = saveImage(180 + i * 5, 120, 150 - i * 5);

    await prisma.record.upsert({
      where: { userId_date: { userId: demoUser.id, date } },
      update: {},
      create: { userId: demoUser.id, date, imageUrl, memo: MEMOS[i % MEMOS.length]!, createdAt: new Date() },
    });
  }

  // 친구는 오늘 기록을 이미 완료한 상태로 — 방에서 O/X가 섞여 보이게
  const today = toKstDateString(0);
  const friendImage = saveImage(200, 180, 160);

  await prisma.record.upsert({
    where: { userId_date: { userId: friend.id, date: today } },
    update: {},
    create: { userId: friend.id, date: today, imageUrl: friendImage, memo: '오늘도 기록 완료!', createdAt: new Date() },
  });

  let room = await prisma.room.findFirst({ where: { name: '데모 기록방' } });
  if (!room) {
    room = await prisma.room.create({
      data: {
        name: '데모 기록방',
        inviteCode: 'DEMO0001',
        members: { create: [{ userId: demoUser.id }, { userId: friend.id }] },
      },
    });
  }

  console.log('시드 완료');
  console.log('데모 계정: demo@example.com / demo1234');
  console.log('친구 계정: demo-friend@example.com / demo1234');
  console.log('방 초대코드:', room.inviteCode);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
