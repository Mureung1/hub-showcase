import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertOperationDate, DEFAULT_STOP_OPERATION_DATE, DIRECTIONAL_CAMPUS_CONFIGS, installCliErrorHandler, readOption, SUPPORTED_CAMPUS_REGIONS } from './lib/data-config.mjs';
import { fetchAllPages, getServiceKey } from './lib/public-data-client.mjs';
import { findStopCandidates } from './lib/stop-usage.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const campusPath = path.join(projectRoot, 'src/shared/data/live-campuses.json');
const mappingPath = path.join(projectRoot, 'src/shared/data/public-stop-mappings.json');
const reportPath = path.join(projectRoot, 'reports/stop-mapping-candidates.json');

installCliErrorHandler('map');
const serviceKey = await getServiceKey(projectRoot);
const operationDate = readOption('date', process.env.BUS_STOP_OPR_YMD ?? DEFAULT_STOP_OPERATION_DATE);
const busStopBaseUrl = process.env.BUS_STOP_API_BASE_URL?.trim() || 'https://apis.data.go.kr/1613000/BusStop';
const endpoint = `${busStopBaseUrl.replace(/\/+$/, '')}/getBusStop`;
assertOperationDate(operationDate);

const [campuses, previousMappings] = await Promise.all([
  readFile(campusPath, 'utf8').then(JSON.parse),
  readFile(mappingPath, 'utf8').then(JSON.parse),
]);

const nextMappings = {};
const report = {
  schemaVersion: 1,
  operationDate,
  generatedAt: new Date().toISOString(),
  campuses: {},
};

for (const campus of campuses) {
  const region = SUPPORTED_CAMPUS_REGIONS[campus.id];
  if (!region) continue;

  console.log(`[map] ${campus.name}: ${region.label} 정류장 조회`);
  const publicStops = await fetchAllPages({
    endpoint,
    serviceKey,
    params: {
      opr_ymd: operationDate,
      ctpv_cd: region.ctpvCd,
      sgg_cd: region.sggCd,
    },
  });

  const campusReport = { region, publicStopCount: publicStops.length, stops: {} };
  for (const stop of campus.stops) {
    const existing = previousMappings.mappings?.[stop.id];
    if (DIRECTIONAL_CAMPUS_CONFIGS[campus.id] && existing) {
      nextMappings[stop.id] = existing;
      campusReport.stops[stop.id] = {
        status: Object.keys(existing.directions ?? {}).length > 0 ? 'mapped-directional' : 'mapped-direction-review',
        mapping: existing,
        candidates: [],
      };
      continue;
    }
    if (existing?.matchedBy === 'manual') {
      nextMappings[stop.id] = existing;
      campusReport.stops[stop.id] = { status: 'mapped-manual', mapping: existing, candidates: [] };
      continue;
    }

    const { exact, ranked } = findStopCandidates(stop.name, publicStops);
    if (exact.length === 1) {
      const match = exact[0];
      const mapping = {
        campusId: campus.id,
        ctpvCd: String(match.ctpv_cd ?? region.ctpvCd),
        sggCd: String(match.sgg_cd ?? region.sggCd),
        sttnId: String(match.sttn_id),
        sourceName: String(match.sttn_nm),
        matchedBy: 'exact-normalized',
        verifiedAt: new Date().toISOString(),
      };
      nextMappings[stop.id] = mapping;
      campusReport.stops[stop.id] = { status: 'mapped-exact', mapping, candidates: [] };
    } else {
      campusReport.stops[stop.id] = {
        status: exact.length > 1 ? 'ambiguous' : 'unmapped',
        candidates: ranked.map(({ sttn_id, sttn_nm, sttn_ars_no, emd_nm, similarity }) => ({
          sttnId: String(sttn_id ?? ''),
          name: String(sttn_nm ?? ''),
          arsNo: String(sttn_ars_no ?? ''),
          neighborhood: String(emd_nm ?? ''),
          similarity: Number(similarity.toFixed(3)),
        })),
      };
    }
  }
  report.campuses[campus.id] = campusReport;
}

const duplicateIds = Object.entries(nextMappings).reduce((result, [appStopId, mapping]) => {
  const activeStops = Object.entries(mapping.directions ?? {});
  const publicStops = activeStops.length > 0
    ? activeStops
    : (Array.isArray(mapping.sources) && mapping.sources.length > 0 ? mapping.sources.map((source, index) => [`source-${index + 1}`, source]) : [['legacy', mapping]]);
  for (const [direction, publicStop] of publicStops) {
    if (!publicStop.sttnId) continue;
    const key = `${mapping.ctpvCd}:${mapping.sggCd}:${publicStop.sttnId}`;
    result[key] ??= [];
    result[key].push(`${appStopId}/${direction}`);
  }
  return result;
}, {});
const duplicate = Object.entries(duplicateIds).find(([, stopIds]) => stopIds.length > 1);
if (duplicate) {
  throw new Error(`하나의 공공 정류장이 여러 정류장에 연결되었습니다: ${duplicate[0]} -> ${duplicate[1].join(', ')}`);
}

await mkdir(path.dirname(reportPath), { recursive: true });
await Promise.all([
  writeFile(mappingPath, `${JSON.stringify({
    schemaVersion: previousMappings.schemaVersion ?? 2,
    operationDate,
    generatedAt: report.generatedAt,
    campuses: previousMappings.campuses ?? DIRECTIONAL_CAMPUS_CONFIGS,
    mappings: nextMappings,
  }, null, 2)}\n`, 'utf8'),
  writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8'),
]);

const unresolved = Object.values(report.campuses).flatMap((campus) => Object.values(campus.stops)).filter((stop) => !stop.status.startsWith('mapped')).length;
console.log(`[map] 완료: ${Object.keys(nextMappings).length}개 매핑, ${unresolved}개 검토 필요`);
console.log(`[map] 후보 보고서: ${path.relative(projectRoot, reportPath)}`);
