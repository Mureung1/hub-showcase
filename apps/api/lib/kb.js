// ============================================================
// lib/kb.js — KB 로더
// ============================================================
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// KB 캐시
const kbCache = new Map();

/**
 * 도메인에 해당하는 KB를 로드
 * @param {string} domain - 'kitchen_odor' | 'bathroom_mold'
 */
export async function loadKB(domain = 'kitchen_odor') {
  if (kbCache.has(domain)) {
    return kbCache.get(domain);
  }

  const kbPath = join(__dirname, '../../../packages/kb/kb/draft', `${domain}.json`);
  const content = await readFile(kbPath, 'utf-8');
  const kb = JSON.parse(content);

  kbCache.set(domain, kb);
  return kb;
}
