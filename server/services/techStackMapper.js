/**
 * 05_CODE_SCANNER_SCORER.md 8장 "tech_stack 매핑 규칙" — 사전 우선 + LLM 보완.
 *
 * 1) 하드코딩 사전(techStackDictionary.js)으로 즉시 분류 가능한 이름을 먼저 처리한다.
 * 2) 사전에 없는(=미분류) 이름만 모아 LLM에게 세션당 1회 배치로 질의한다
 *    (건별 호출 금지 — 미분류 목록이 비어있으면 API 호출 자체를 하지 않는다).
 */

import { lookupDictionary } from './techStackDictionary.js';
import { getActiveProvider } from './llmProviders/index.js';

const CATEGORIES = ['language', 'framework', 'database', 'infra'];

function emptyBuckets() {
  return { language: [], framework: [], database: [], infra: [] };
}

/**
 * 순수 함수 — API 호출 없음. 사전으로 분류 가능한 이름은 matched에,
 * 사전(EXCLUDED 포함)에 없는 이름만 unclassified에 담는다.
 */
export function classifyWithDictionary(names) {
  const matched = emptyBuckets();
  const unclassifiedSet = new Set();
  const seen = new Set();

  for (const rawName of names) {
    const name = (rawName || '').trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());

    const category = lookupDictionary(name);
    if (category === null) continue; // 의도적으로 제외(순수 개발 도구 등)
    if (category === undefined) {
      unclassifiedSet.add(name);
      continue;
    }
    matched[category].push(name);
  }

  return { matched, unclassified: [...unclassifiedSet] };
}

/**
 * 사전에 없는 이름들을 LLM에게 한 번에 질의해 분류한다.
 * 미분류 목록이 비어있거나, .env에 설정된 프로바이더 키가 하나도 없으면
 * 호출 없이 빈 결과를 반환한다. ANTHROPIC_API_KEY / GEMINI_API_KEY / OPENAI_API_KEY
 * 중 어떤 것이 설정돼 있든 해당 프로바이더로 자동 전환된다.
 */
export async function classifyUnclassified(names) {
  if (names.length === 0) return emptyBuckets();

  const provider = getActiveProvider();
  if (!provider) return emptyBuckets();

  return provider.classify(names);
}

function mergeBuckets(a, b) {
  const merged = emptyBuckets();
  for (const category of CATEGORIES) {
    merged[category] = [...new Set([...a[category], ...b[category]])].sort();
  }
  return merged;
}

export async function mapTechStack(names) {
  const { matched, unclassified } = classifyWithDictionary(names);
  const llmResult = await classifyUnclassified(unclassified);
  return mergeBuckets(matched, llmResult);
}
