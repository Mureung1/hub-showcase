import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertMonth, DEFAULT_MONTH, installCliErrorHandler, readOption } from './lib/data-config.mjs';
import { fetchAllPages, getServiceKey } from './lib/public-data-client.mjs';
import { aggregateMonthlyItems, scoreCampusUsage, scoreDirectionalUsage } from './lib/stop-usage.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mappingPath = path.join(projectRoot, 'src/shared/data/public-stop-mappings.json');
const outputPath = path.join(projectRoot, 'src/shared/data/generated-stop-usage.json');

installCliErrorHandler('usage');
const serviceKey = await getServiceKey(projectRoot);
const month = readOption('month', process.env.TRIP_VOLUME_OPR_YM ?? DEFAULT_MONTH);
const tripVolumeBaseUrl = process.env.TRIP_VOLUME_API_BASE_URL?.trim() || 'https://apis.data.go.kr/1613000/TripVolumebyStop';
const endpoint = `${tripVolumeBaseUrl.replace(/\/+$/, '')}/getMonthlyTripVolumebyStop`;
assertMonth(month);

const mappingManifest = await readFile(mappingPath, 'utf8').then(JSON.parse);
const mappings = Object.entries(mappingManifest.mappings ?? {});
if (mappings.length === 0) {
  throw new Error('매핑된 정류장이 없습니다. 국토교통부_버스정류장 활용신청 후 npm run data:map을 먼저 실행하세요.');
}

const fetchedAt = new Date().toISOString();
const directionalEntries = mappings.flatMap(([appStopId, mapping]) => Object.entries(mapping.directions ?? {}).map(([direction, publicStop]) => ({
  appStopId,
  direction,
  mapping,
  publicStop,
})));
const publicStopsFor = (mapping) => Array.isArray(mapping.sources) && mapping.sources.length > 0
  ? mapping.sources
  : [{ sttnId: mapping.sttnId, sourceName: mapping.sourceName }];
const legacyEntries = mappings
  .filter(([, mapping]) => Object.keys(mapping.directions ?? {}).length === 0 && !mappingManifest.campuses?.[mapping.campusId])
  .map(([appStopId, mapping]) => ({ appStopId, mapping }));

if (directionalEntries.length > 0) {
  const rawDirectionalUsage = {};
  const rawLegacyUsage = {};
  const fetchCache = new Map();

  const fetchPublicStop = (mapping, publicStop) => {
    const cacheKey = `${mapping.ctpvCd}:${mapping.sggCd}:${publicStop.sttnId}`;
    if (!fetchCache.has(cacheKey)) {
      fetchCache.set(cacheKey, fetchAllPages({
        endpoint,
        serviceKey,
        params: {
          opr_ym: month,
          ctpv_cd: mapping.ctpvCd,
          sgg_cd: mapping.sggCd,
          sttn_id: publicStop.sttnId,
        },
      }).catch((error) => {
        throw new Error(`정류장 ${publicStop.sttnId} 조회 실패: ${error?.message ?? error}`);
      }));
    }
    return fetchCache.get(cacheKey);
  };

  for (const entry of directionalEntries) {
    const { appStopId, direction, mapping, publicStop } = entry;
    console.log(`[usage] ${appStopId}/${direction}: ${month} 조회`);
    const items = await fetchPublicStop(mapping, publicStop);
    rawDirectionalUsage[`${appStopId}:${direction}`] = {
      appStopId,
      direction,
      campusId: mapping.campusId,
      itemCount: items.length,
      ...aggregateMonthlyItems(items),
    };
  }

  for (const { appStopId, mapping } of legacyEntries) {
    const publicStops = publicStopsFor(mapping);
    console.log(`[usage] ${appStopId}: ${month} 승강장 ${publicStops.length}곳 합산 조회`);
    const itemGroups = await Promise.all(publicStops.map((publicStop) => fetchPublicStop(mapping, publicStop)));
    const items = itemGroups.flat();
    rawLegacyUsage[appStopId] = {
      appStopId,
      campusId: mapping.campusId,
      itemCount: items.length,
      sourceCount: publicStops.length,
      aggregation: mapping.aggregation ?? (publicStops.length > 1 ? 'sum-exact-name-platforms' : 'single-stop'),
      ...aggregateMonthlyItems(items),
    };
  }

  const stops = {};
  const campusReferences = {};
  const campusIds = [...new Set(Object.values(rawDirectionalUsage).map((usage) => usage.campusId))];
  for (const campusId of campusIds) {
    const campusEntries = Object.entries(rawDirectionalUsage).filter(([, usage]) => usage.campusId === campusId);
    const totalsByStop = {};
    for (const [, usage] of campusEntries) {
      totalsByStop[usage.appStopId] ??= {};
      totalsByStop[usage.appStopId][usage.direction] = usage.totals;
    }
    const { reference, scores } = scoreDirectionalUsage(totalsByStop);
    campusReferences[campusId] = reference;
    for (const [, usage] of campusEntries) {
      const hasUsage = usage.itemCount > 0 && usage.totals.some((value) => value > 0) && reference > 0;
      stops[usage.appStopId] ??= { directions: {} };
      stops[usage.appStopId].directions[usage.direction] = {
        status: hasUsage ? 'ready' : 'no-data',
        period: month,
        fetchedAt,
        boardings: usage.boardings,
        alightings: usage.alightings,
        totals: usage.totals,
        hours: hasUsage ? scores[usage.appStopId][usage.direction] : undefined,
        campusReferenceP95: reference,
      };
    }
  }

  const legacyCampusIds = [...new Set(Object.values(rawLegacyUsage).map((usage) => usage.campusId))];
  for (const campusId of legacyCampusIds) {
    const campusEntries = Object.entries(rawLegacyUsage).filter(([, usage]) => usage.campusId === campusId);
    const { reference, scores } = scoreCampusUsage(Object.fromEntries(campusEntries.map(([stopId, usage]) => [stopId, usage.totals])));
    campusReferences[campusId] = reference;
    for (const [stopId, usage] of campusEntries) {
      const hasUsage = usage.itemCount > 0 && usage.totals.some((value) => value > 0) && reference > 0;
      stops[stopId] = {
        status: hasUsage ? 'ready' : 'no-data',
        period: month,
        fetchedAt,
        boardings: usage.boardings,
        alightings: usage.alightings,
        totals: usage.totals,
        hours: hasUsage ? scores[stopId] : undefined,
        campusReferenceP95: reference,
        aggregation: usage.aggregation,
        sourceCount: usage.sourceCount,
      };
    }
  }

  const output = {
    schemaVersion: 2,
    source: '국토교통부_정류장별 이용량',
    period: month,
    fetchedAt,
    campusReferences,
    stops,
  };
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  const readyDirectionCount = Object.values(stops).flatMap((stop) => Object.values(stop.directions ?? {})).filter((usage) => usage.status === 'ready').length;
  const readyLegacyCount = Object.values(stops).filter((stop) => stop.status === 'ready').length;
  console.log(`[usage] 완료: 방향 통계 ${readyDirectionCount}/${directionalEntries.length}개, 합산 통계 ${readyLegacyCount}/${legacyEntries.length}개 사용 가능`);
  console.log(`[usage] 출력: ${path.relative(projectRoot, outputPath)}`);
  process.exit(0);
}

const rawUsage = {};

for (const [appStopId, mapping] of mappings) {
  const publicStops = publicStopsFor(mapping);
  console.log(`[usage] ${appStopId}: ${month} 승강장 ${publicStops.length}곳 합산 조회`);
  const itemGroups = await Promise.all(publicStops.map((publicStop) => fetchAllPages({
    endpoint,
    serviceKey,
    params: {
      opr_ym: month,
      ctpv_cd: mapping.ctpvCd,
      sgg_cd: mapping.sggCd,
      sttn_id: publicStop.sttnId,
    },
  })));
  const items = itemGroups.flat();

  rawUsage[appStopId] = {
    campusId: mapping.campusId,
    itemCount: items.length,
    sourceCount: publicStops.length,
    aggregation: mapping.aggregation ?? (publicStops.length > 1 ? 'sum-exact-name-platforms' : 'single-stop'),
    ...aggregateMonthlyItems(items),
  };
}

const campusIds = [...new Set(Object.values(rawUsage).map((usage) => usage.campusId))];
const stops = {};
for (const campusId of campusIds) {
  const campusEntries = Object.entries(rawUsage).filter(([, usage]) => usage.campusId === campusId);
  const { reference, scores } = scoreCampusUsage(Object.fromEntries(campusEntries.map(([stopId, usage]) => [stopId, usage.totals])));

  for (const [stopId, usage] of campusEntries) {
    const hasUsage = usage.itemCount > 0 && usage.totals.some((value) => value > 0) && reference > 0;
    stops[stopId] = {
      status: hasUsage ? 'ready' : 'no-data',
      period: month,
      fetchedAt,
      boardings: usage.boardings,
      alightings: usage.alightings,
      totals: usage.totals,
      hours: hasUsage ? scores[stopId] : undefined,
      campusReferenceP95: reference,
      aggregation: usage.aggregation,
      sourceCount: usage.sourceCount,
    };
  }
}

const output = {
  schemaVersion: 1,
  source: '국토교통부_정류장별 이용량',
  period: month,
  fetchedAt,
  stops,
};
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

const readyCount = Object.values(stops).filter((stop) => stop.status === 'ready').length;
console.log(`[usage] 완료: ${readyCount}/${Object.keys(stops).length}개 정류장 사용 가능`);
console.log(`[usage] 출력: ${path.relative(projectRoot, outputPath)}`);
