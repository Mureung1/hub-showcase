import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function toKstDateString(daysAgo: number): string {
  const now = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/** picsum.photos는 실제 사진을 반환하는 외부 이미지 서비스라, 서버 디스크에 저장하지 않아도(Render 재배포에도) 항상 뜬다. */
function demoPhotoUrl(seed: string): string {
  return `https://picsum.photos/seed/challengelog-${seed}/600/600`;
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

  // 이전에 올라간(깨졌을 수 있는) 기록은 전부 지우고 목데이터로 새로 채운다
  await prisma.record.deleteMany({ where: { userId: { in: [demoUser.id, friend.id] } } });

  // 오늘 포함 최근 8일치 기록 — 캘린더 + 홈 화면이 항상 사진으로 채워져 보이도록
  for (let i = 0; i <= 7; i += 1) {
    const date = toKstDateString(i);
    const imageUrl = demoPhotoUrl(`${demoUser.id}-${i}`);
    const memo = MEMOS[i % MEMOS.length]!;

    await prisma.record.upsert({
      where: { userId_date: { userId: demoUser.id, date } },
      update: { imageUrl, memo },
      create: { userId: demoUser.id, date, imageUrl, memo, createdAt: new Date() },
    });
  }

  // 친구도 오늘 기록을 이미 완료한 상태로 — 방에서 O/X가 섞여 보이게
  const today = toKstDateString(0);
  const friendImage = demoPhotoUrl(`${friend.id}-today`);

  await prisma.record.upsert({
    where: { userId_date: { userId: friend.id, date: today } },
    update: { imageUrl: friendImage, memo: '오늘도 기록 완료!' },
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

  console.log('시드 완료 (picsum.photos 실사진 URL 사용, Render 재배포에도 안 깨짐)');
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
