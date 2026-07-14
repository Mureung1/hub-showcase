import { DEMO_NOW } from '../data/bakeries.js';

export function isOpenNow(b, now = DEMO_NOW) {
  return now >= b.openHour && now < b.closeHour;
}

// '곧 마감' | '한산해요' | null — 추가기능 스펙 1번(마감임박/한산해요 말풍선)
export function bakeryStatus(b, now = DEMO_NOW) {
  if (b.closeHour - now <= 1) return 'closing';
  const busyNow = now >= b.busyStart && now < b.busyEnd;
  if (!busyNow) return 'quiet';
  return null;
}

export function statusMeta(status) {
  if (status === 'closing') return { label: '곧 마감', cls: 'closing' };
  if (status === 'quiet') return { label: '한산해요', cls: 'quiet' };
  return null;
}
