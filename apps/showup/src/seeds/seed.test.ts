import { previewSeedCustomers } from './seed';

const previews = previewSeedCustomers();
console.table(
  previews.map((p) => ({
    id: p.id,
    name: p.name,
    phone: p.phoneMasked,
    level: p.riskLevel,
    score: p.score,
    alert: p.alert,
    noShow: p.noShowCount,
    abuse: p.abuseCount,
  })),
);

// 검증: 노쇼 3회 이상 또는 abuse 1회 이상이면 alert=true
let failed = 0;

if (previews.length !== 10) {
  failed += 1;
  console.error(`시드 고객 수=${previews.length}, expected=10`);
}

const levels = new Set(previews.map((preview) => preview.riskLevel));
for (const requiredLevel of ['low', 'medium', 'high'] as const) {
  if (!levels.has(requiredLevel)) {
    failed += 1;
    console.error(`시드 위험 등급 누락: ${requiredLevel}`);
  }
}

for (const p of previews) {
  const expectedAlert = p.noShowCount >= 3 || p.abuseCount >= 1;
  if (p.alert !== expectedAlert) {
    failed += 1;
    console.error(`❌ ${p.name}: alert=${p.alert}, expected=${expectedAlert}`);
  }
}

if (failed > 0) {
  process.exit(1);
}
console.log('시드 데이터 preview 검증 통과');
