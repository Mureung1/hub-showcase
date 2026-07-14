// server.mjs가 실제 확장 프로그램 사용 중에 usage-log.jsonl에 쌓아둔 실측 토큰 사용량을 집계한다.
// 실행: npm run usage-report
import { readFile } from 'node:fs/promises';

const LOG_PATH = new URL('./usage-log.jsonl', import.meta.url);
// 2026-08-31까지 적용되는 도입가 (Claude Sonnet 5)
const INPUT_PRICE_PER_M = 2.0;
const OUTPUT_PRICE_PER_M = 10.0;

let raw;
try {
  raw = await readFile(LOG_PATH, 'utf-8');
} catch {
  console.log('아직 기록된 사용량이 없습니다 — 확장 프로그램으로 가이드를 한 번 실행하면 server.mjs가 usage-log.jsonl에 자동으로 기록합니다.');
  process.exit(0);
}

const entries = raw
  .split('\n')
  .filter(Boolean)
  .map((line) => JSON.parse(line));

if (entries.length === 0) {
  console.log('기록된 호출이 없습니다.');
  process.exit(0);
}

const totalInput = entries.reduce((sum, e) => sum + e.input_tokens, 0);
const totalOutput = entries.reduce((sum, e) => sum + e.output_tokens, 0);
const cost = (totalInput / 1_000_000) * INPUT_PRICE_PER_M + (totalOutput / 1_000_000) * OUTPUT_PRICE_PER_M;

console.log(`기록된 호출 수: ${entries.length}건`);
console.log(`입력 토큰 합계: ${totalInput}`);
console.log(`출력 토큰 합계: ${totalOutput}`);
console.log(`총 비용(추정, 도입가 $2.00/$10.00 기준): $${cost.toFixed(6)}`);

console.log('\n최근 호출 5건:');
entries.slice(-5).forEach((e) => {
  console.log(`  ${e.ts}  입력 ${e.input_tokens} / 출력 ${e.output_tokens}`);
});
