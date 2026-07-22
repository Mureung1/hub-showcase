import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installCliErrorHandler, SUPPORTED_CAMPUS_REGIONS } from './lib/data-config.mjs';
import { loadLocalEnv } from './lib/public-data-client.mjs';
import { assertHourArray } from './lib/stop-usage.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
installCliErrorHandler('validate');
const readJson = (relativePath) => readFile(path.join(projectRoot, relativePath), 'utf8').then((text) => ({ text, value: JSON.parse(text) }));
const [{ value: campuses }, mappingsFile, usageFile] = await Promise.all([
  readJson('src/data/live-campuses.json'),
  readJson('src/data/public-stop-mappings.json'),
  readJson('src/data/generated-stop-usage.json'),
]);

try {
  loadLocalEnv(await readFile(path.join(projectRoot, '.env.local'), 'utf8'));
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

const appStops = new Map(campuses.flatMap((campus) => campus.stops.map((stop) => [stop.id, { campus, stop }])));
const publicIds = new Map();
const directionKeys = ['a', 'c'];

for (const [campusId, config] of Object.entries(mappingsFile.value.campuses ?? {})) {
  const campus = campuses.find((entry) => entry.id === campusId);
  if (!campus) throw new Error(`방향 설정이 존재하지 않는 캠퍼스를 가리킵니다: ${campusId}`);
  if (!Array.isArray(config.route) || config.route.length !== 3 || new Set(config.route).size !== 3) {
    throw new Error(`${campusId} 방향 route는 중복 없는 정류장 3개여야 합니다.`);
  }
  for (const stopId of config.route) {
    if (!campus.stops.some((stop) => stop.id === stopId)) throw new Error(`${campusId} route에 다른 캠퍼스 정류장이 있습니다: ${stopId}`);
  }
  if (config.directions?.a?.endpointStopId !== config.route[0]) throw new Error(`${campusId} A 방향 끝점은 route 첫 정류장이어야 합니다.`);
  if (config.directions?.c?.endpointStopId !== config.route[2]) throw new Error(`${campusId} C 방향 끝점은 route 마지막 정류장이어야 합니다.`);
  for (const direction of directionKeys) if (!config.directions?.[direction]?.label) throw new Error(`${campusId} ${direction} 방향 라벨이 없습니다.`);
}

for (const [stopId, mapping] of Object.entries(mappingsFile.value.mappings ?? {})) {
  const appStop = appStops.get(stopId);
  if (!appStop) throw new Error(`매핑이 존재하지 않는 앱 정류장을 가리킵니다: ${stopId}`);
  if (!SUPPORTED_CAMPUS_REGIONS[appStop.campus.id]) throw new Error(`미지원 캠퍼스에 공공데이터 매핑이 있습니다: ${stopId}`);
  if (mapping.campusId !== appStop.campus.id) throw new Error(`매핑 campusId가 일치하지 않습니다: ${stopId}`);
  for (const key of ['ctpvCd', 'sggCd']) {
    if (!mapping[key]) throw new Error(`${stopId} 매핑에 ${key}가 없습니다.`);
  }
  const activeDirections = Object.entries(mapping.directions ?? {});
  if (activeDirections.length > 0) {
    if (!mappingsFile.value.campuses?.[mapping.campusId]) throw new Error(`${stopId} 방향 매핑에 캠퍼스 방향 설정이 없습니다.`);
    for (const [direction, publicStop] of activeDirections) {
      if (!directionKeys.includes(direction)) throw new Error(`${stopId}에 알 수 없는 방향이 있습니다: ${direction}`);
      for (const key of ['sttnId', 'sourceName', 'matchedBy', 'verifiedAt']) if (!publicStop[key]) throw new Error(`${stopId}/${direction} 매핑에 ${key}가 없습니다.`);
      const publicId = `${mapping.ctpvCd}:${mapping.sggCd}:${publicStop.sttnId}`;
      if (publicIds.has(publicId)) throw new Error(`공공 정류장 ID가 중복 연결되었습니다: ${publicId}`);
      publicIds.set(publicId, `${stopId}/${direction}`);
    }
  } else {
    for (const key of ['sttnId', 'sourceName']) if (!mapping[key]) throw new Error(`${stopId} 레거시 매핑에 ${key}가 없습니다.`);
    const sources = Array.isArray(mapping.sources) && mapping.sources.length > 0 ? mapping.sources : [mapping];
    if (sources.length > 1 && mapping.aggregation !== 'sum-exact-name-platforms') {
      throw new Error(`${stopId} 다중 승강장 매핑의 aggregation이 올바르지 않습니다.`);
    }
    for (const source of sources) {
      for (const key of ['sttnId', 'sourceName']) if (!source[key]) throw new Error(`${stopId} 승강장 묶음에 ${key}가 없습니다.`);
      const publicId = `${mapping.ctpvCd}:${mapping.sggCd}:${source.sttnId}`;
      if (publicIds.has(publicId)) throw new Error(`공공 정류장 ID가 중복 연결되었습니다: ${publicId}`);
      publicIds.set(publicId, stopId);
    }
  }
}

if (!/^\d{6}$/.test(usageFile.value.period ?? '')) throw new Error('생성 데이터 period는 YYYYMM 형식이어야 합니다.');
for (const [stopId, usage] of Object.entries(usageFile.value.stops ?? {})) {
  if (!appStops.has(stopId)) throw new Error(`생성 데이터에 존재하지 않는 앱 정류장이 있습니다: ${stopId}`);
  const mapping = mappingsFile.value.mappings?.[stopId];
  if (!mapping) throw new Error(`생성 데이터에 매핑되지 않은 정류장이 있습니다: ${stopId}`);
  const hasDirections = usageFile.value.schemaVersion === 2 && usage.directions && typeof usage.directions === 'object';
  const usageEntries = hasDirections ? Object.entries(usage.directions) : [['legacy', usage]];
  for (const [direction, entry] of usageEntries) {
    if (hasDirections && !mapping.directions?.[direction]) throw new Error(`${stopId}/${direction} 생성 데이터에 승인된 매핑이 없습니다.`);
    if (!hasDirections && mappingsFile.value.campuses?.[mapping.campusId]) throw new Error(`${stopId} 방향 캠퍼스에 단일 통계가 생성되었습니다.`);
    if (!['ready', 'no-data'].includes(entry.status)) throw new Error(`${stopId}/${direction}의 status가 올바르지 않습니다: ${entry.status}`);
    assertHourArray(entry.boardings, `${stopId}/${direction}.boardings`);
    assertHourArray(entry.alightings, `${stopId}/${direction}.alightings`);
    assertHourArray(entry.totals, `${stopId}/${direction}.totals`);
    if (entry.status === 'ready') assertHourArray(entry.hours, `${stopId}/${direction}.hours`, { max: 100 });
    if (entry.status === 'no-data' && entry.hours !== undefined) throw new Error(`${stopId}/${direction} no-data 항목에는 hours가 없어야 합니다.`);
    if (usageFile.value.schemaVersion === 2 && entry.campusReferenceP95 !== usageFile.value.campusReferences?.[mapping.campusId]) {
      throw new Error(`${stopId}/${direction}의 공통 P95 기준이 캠퍼스 기준과 다릅니다.`);
    }
    if (!hasDirections) {
      const expectedSourceCount = Array.isArray(mapping.sources) && mapping.sources.length > 0 ? mapping.sources.length : 1;
      if (entry.sourceCount !== expectedSourceCount) throw new Error(`${stopId} 합산 승강장 수가 매핑과 다릅니다.`);
      const expectedAggregation = expectedSourceCount > 1 ? 'sum-exact-name-platforms' : 'single-stop';
      if (entry.aggregation !== expectedAggregation) throw new Error(`${stopId} 합산 방식이 매핑과 다릅니다.`);
    }
  }
}

for (const stopId of Object.keys(mappingsFile.value.mappings ?? {})) {
  if (!usageFile.value.stops?.[stopId]) throw new Error(`승인된 매핑의 생성 데이터가 누락되었습니다: ${stopId}`);
}

const configuredKey = process.env.DATA_GO_KR_SERVICE_KEY?.trim();
const serializedData = `${mappingsFile.text}\n${usageFile.text}`;
if (/serviceKey|DATA_GO_KR_SERVICE_KEY/i.test(serializedData)) throw new Error('생성 JSON에 인증키 필드명이 포함되어 있습니다.');
if (configuredKey && serializedData.includes(configuredKey)) throw new Error('생성 JSON에 인증키 값이 포함되어 있습니다.');

const supportedStops = campuses.filter((campus) => SUPPORTED_CAMPUS_REGIONS[campus.id]).reduce((total, campus) => total + campus.stops.length, 0);
const unsupportedStops = appStops.size - supportedStops;
const generatedStops = Object.values(usageFile.value.stops ?? {});
const readyDirections = generatedStops.flatMap((stop) => Object.values(stop.directions ?? {})).filter((entry) => entry.status === 'ready').length;
const readyStops = generatedStops.filter((stop) => stop.status === 'ready').length;
console.log(`[validate] 성공: 방향 통계 ${readyDirections}개, 합산 통계 ${readyStops}개, 지도 전용 ${unsupportedStops}개`);
