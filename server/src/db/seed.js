import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';
import { db } from './index.js';

// `npm run db:seed`로 실행. 프로젝트 루트의 list.csv 중 주소가 채워진 행만 네이버 지오코딩으로
// 좌표를 구해 bakeries 테이블에 넣는다. 주소 없는 행(아직 수집 안 된 곳)은 건너뛴다.
const CSV_PATH = path.join(process.cwd(), '../list.csv');

function parseHourRange(str) {
  if (!str) return { open: null, close: null };
  const match = str.match(/(\d{1,2}):(\d{2})\s*~\s*(\d{1,2}):(\d{2})/);
  if (!match) return { open: null, close: null };
  const [, h1, m1, h2, m2] = match;
  return { open: Number(h1) + Number(m1) / 60, close: Number(h2) + Number(m2) / 60 };
}

async function geocode(address) {
  // 괄호 안 지점명(예: "(둔산본점)")은 지오코딩 정확도에 방해될 수 있어 제거
  const query = address.replace(/\([^)]*\)/g, '').trim();
  const res = await fetch(`https://maps.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(query)}`, {
    headers: {
      'x-ncp-apigw-api-key-id': process.env.NCP_CLIENT_ID,
      'x-ncp-apigw-api-key': process.env.NCP_CLIENT_SECRET,
    },
  });
  const body = await res.json();
  const first = body.addresses?.[0];
  if (!first) return null;
  return { lat: Number(first.y), lng: Number(first.x) };
}

function parseCsv(text) {
  const lines = text.trim().split('\n').slice(1); // 헤더 제외
  return lines.map((line) => {
    const [name, address, signatureMenu, comment, priceRange, openHours, closedDays, busyHours] = line
      .split(',')
      .map((v) => v.trim());
    return { name, address, signatureMenu, comment, priceRange, openHours, closedDays, busyHours };
  });
}

async function seed() {
  const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf-8')).filter((r) => r.address);
  console.log(`주소 있는 ${rows.length}곳 시드 시작`);

  for (const row of rows) {
    const { rows: existing } = await db.query('SELECT id FROM bakeries WHERE name = $1', [row.name]);
    if (existing.length) {
      console.log(`  - ${row.name} — 이미 있음, 건너뜀`);
      continue;
    }

    const coord = await geocode(row.address);
    if (!coord) {
      console.log(`  ✗ ${row.name} — 지오코딩 실패, 건너뜀`);
      continue;
    }
    const { open, close } = parseHourRange(row.openHours);
    await db.query(
      `INSERT INTO bakeries (name, address, lat, lng, signature_menu, comment, price_range, open_hour, close_hour, closed_days, busy_hours)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        row.name,
        row.address,
        coord.lat,
        coord.lng,
        row.signatureMenu || null,
        row.comment || null,
        row.priceRange || null,
        open,
        close,
        row.closedDays || null,
        row.busyHours || null,
      ]
    );
    console.log(`  ✓ ${row.name} (${coord.lat}, ${coord.lng})`);
  }

  console.log('시드 완료');
  await db.end();
}

seed().catch((err) => {
  console.error('시드 실패:', err.message);
  process.exit(1);
});
