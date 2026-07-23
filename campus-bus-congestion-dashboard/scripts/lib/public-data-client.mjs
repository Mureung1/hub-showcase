import { readFile } from 'node:fs/promises';
import path from 'node:path';

const SUCCESS_CODES = new Set(['0', '00', '200']);

export function loadLocalEnv(contents) {
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const name = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
    if (!(name in process.env)) process.env[name] = value;
  }
}

export async function getServiceKey(projectRoot) {
  try {
    loadLocalEnv(await readFile(path.join(projectRoot, '.env.local'), 'utf8'));
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY?.trim();
  if (!serviceKey) {
    throw new Error('DATA_GO_KR_SERVICE_KEY가 없습니다. .env.local에 인증키를 설정하세요.');
  }
  return serviceKey;
}

function apiError(payload) {
  const error = payload?.Error ?? payload?.error;
  if (error) {
    const code = error.code ?? error.resultCode ?? 'UNKNOWN';
    const message = error.message ?? error.resultMsg ?? '공공데이터 API 오류';
    return new Error(`공공데이터 API 오류 ${code}: ${message}`);
  }

  const response = payload?.response ?? payload?.Response ?? payload;
  const header = response?.header ?? response?.Header;
  const code = String(header?.resultCode ?? '');
  if (code && !SUCCESS_CODES.has(code)) {
    return new Error(`공공데이터 API 오류 ${code}: ${header?.resultMsg ?? '요청 실패'}`);
  }
  return null;
}

export function parseApiPayload(payload) {
  if (typeof payload === 'string') {
    try {
      return parseApiPayload(JSON.parse(payload));
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error('공공데이터 API 응답이 JSON 문자열이지만 내부 JSON이 올바르지 않습니다.');
      throw error;
    }
  }
  const error = apiError(payload);
  if (error) throw error;

  const response = payload?.response ?? payload?.Response ?? payload;
  const body = response?.body ?? response?.Body;
  if (!body || typeof body !== 'object') {
    const topKeys = payload && typeof payload === 'object' ? Object.keys(payload).join(', ') : typeof payload;
    const responseKeys = response && typeof response === 'object' ? Object.keys(response).join(', ') : '없음';
    throw new Error(`공공데이터 API 응답에 body가 없습니다. 최상위 키: ${topKeys || '없음'}, response 키: ${responseKeys || '없음'}`);
  }

  const itemsContainer = body.items ?? body.Items;
  const rawItems = itemsContainer?.item ?? itemsContainer?.Item ?? [];
  const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
  return {
    items,
    totalCount: Number(body.totalCount ?? body.TotalCount ?? items.length) || 0,
  };
}

async function fetchJson(endpoint, params, serviceKey) {
  const url = new URL(endpoint);
  url.searchParams.set('serviceKey', serviceKey);
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(name, String(value));
    }
  }

  let response;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      response = await fetch(url, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(20_000),
      });
      break;
    } catch (error) {
      if (attempt === 3) throw new Error(`공공데이터 API 연결 실패(3회 시도): ${error?.message ?? error}`);
      console.warn(`[api] 연결 지연으로 재시도 ${attempt}/2`);
      await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }

  const text = await response.text();
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(`인증 또는 API 활용승인 실패(HTTP ${response.status}). 공공데이터포털에서 해당 API의 개발계정 승인을 확인하세요.`);
    }
    throw new Error(`공공데이터 API HTTP ${response.status}: ${text.slice(0, 160) || response.statusText}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`공공데이터 API가 JSON이 아닌 응답을 반환했습니다: ${text.slice(0, 160)}`);
  }
}

export async function fetchAllPages({ endpoint, params, serviceKey, pageSize = 1000 }) {
  const items = [];
  let pageNo = 1;
  let totalCount = 0;

  do {
    const payload = await fetchJson(endpoint, {
      ...params,
      pageNo,
      numOfRows: pageSize,
      dataType: 'JSON',
    }, serviceKey);
    const page = parseApiPayload(payload);
    items.push(...page.items);
    totalCount = page.totalCount;
    pageNo += 1;
  } while (items.length < totalCount);

  return items;
}
