// @ts-check
// 샘플 전표를 실제 데이터 파일로 복사한다: data/entries.sample.json → data/entries.json
import { copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'data', 'entries.sample.json');
const dest = process.env.LEDGER_DATA_FILE ?? path.join(root, 'data', 'entries.json');

await copyFile(src, dest);
console.log(`시드 완료: ${src} → ${dest}`);
