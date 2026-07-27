import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertMonth,
  DEFAULT_MONTH,
  DEFAULT_STOP_OPERATION_DATE,
  DIRECTIONAL_CAMPUS_CONFIGS,
  installCliErrorHandler,
  readOption,
  SUPPORTED_CAMPUS_REGIONS,
} from './lib/data-config.mjs';
import { fetchAllPages, getServiceKey } from './lib/public-data-client.mjs';
import { aggregateMonthlyItems, normalizeStopName } from './lib/stop-usage.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const campusPath = path.join(projectRoot, 'src/shared/data/live-campuses.json');
const mappingPath = path.join(projectRoot, 'src/shared/data/public-stop-mappings.json');
const reportPath = path.join(projectRoot, 'reports/directional-stop-candidates.json');

installCliErrorHandler('directions');
const serviceKey = await getServiceKey(projectRoot);
const month = readOption('month', process.env.TRIP_VOLUME_OPR_YM ?? DEFAULT_MONTH);
const operationDate = process.env.BUS_STOP_OPR_YMD ?? DEFAULT_STOP_OPERATION_DATE;
const busStopBaseUrl = process.env.BUS_STOP_API_BASE_URL?.trim() || 'https://apis.data.go.kr/1613000/BusStop';
const tripVolumeBaseUrl = process.env.TRIP_VOLUME_API_BASE_URL?.trim() || 'https://apis.data.go.kr/1613000/TripVolumebyStop';
assertMonth(month);

const [campuses, mappingManifest] = await Promise.all([
  readFile(campusPath, 'utf8').then(JSON.parse),
  readFile(mappingPath, 'utf8').then(JSON.parse),
]);

function baseStopName(name) {
  return normalizeStopName(name).replace(/(?:앞|건너)\d*$/u, '');
}

function approvedDirectionIds(mapping) {
  return new Set(Object.values(mapping?.directions ?? {}).map((entry) => String(entry?.sttnId ?? '')).filter(Boolean));
}

const report = {
  schemaVersion: 1,
  period: month,
  operationDate,
  generatedAt: new Date().toISOString(),
  campuses: {},
};

for (const [campusId, config] of Object.entries(DIRECTIONAL_CAMPUS_CONFIGS)) {
  const campus = campuses.find((entry) => entry.id === campusId);
  const region = SUPPORTED_CAMPUS_REGIONS[campusId];
  if (!campus || !region) throw new Error(`방향 캠퍼스 설정을 찾을 수 없습니다: ${campusId}`);

  console.log(`[directions] ${campus.name}: 정류장 후보 조회`);
  const publicStops = await fetchAllPages({
    endpoint: `${busStopBaseUrl.replace(/\/+$/, '')}/getBusStop`,
    serviceKey,
    params: { opr_ymd: operationDate, ctpv_cd: region.ctpvCd, sgg_cd: region.sggCd },
  });
  const candidateById = new Map();
  const stopReports = {};

  for (const appStopId of config.route) {
    const appStop = campus.stops.find((stop) => stop.id === appStopId);
    if (!appStop) throw new Error(`${campusId} 노선에 존재하지 않는 정류장이 있습니다: ${appStopId}`);
    const baseName = baseStopName(appStop.name);
    let candidates = publicStops.filter((stop) => baseStopName(stop.sttn_nm) === baseName);
    const numbered = candidates.filter((stop) => String(stop.sttn_ars_no ?? '') !== '~');
    if (numbered.length >= 2) candidates = numbered;
    for (const candidate of candidates) candidateById.set(String(candidate.sttn_id), candidate);
    const existing = mappingManifest.mappings?.[appStopId];
    stopReports[appStopId] = {
      appName: appStop.name,
      approved: existing?.directions ?? {},
      legacyCandidateId: existing?.sttnId,
      candidates: [],
    };
  }

  const usageById = {};
  for (const [sttnId, candidate] of candidateById) {
    console.log(`[directions] ${campus.name}: ${candidate.sttn_nm} (${sttnId}) 이용량 조회`);
    const items = await fetchAllPages({
      endpoint: `${tripVolumeBaseUrl.replace(/\/+$/, '')}/getMonthlyTripVolumebyStop`,
      serviceKey,
      params: { opr_ym: month, ctpv_cd: region.ctpvCd, sgg_cd: region.sggCd, sttn_id: sttnId },
    });
    const usage = aggregateMonthlyItems(items);
    usageById[sttnId] = {
      itemCount: items.length,
      monthlyTotal: usage.totals.reduce((sum, value) => sum + value, 0),
      peakHour: usage.totals.indexOf(Math.max(...usage.totals)),
      peakTotal: Math.max(...usage.totals),
    };
  }

  for (const appStopId of config.route) {
    const reportStop = stopReports[appStopId];
    const approvedIds = approvedDirectionIds(mappingManifest.mappings?.[appStopId]);
    reportStop.candidates = [...candidateById.values()]
      .filter((candidate) => baseStopName(candidate.sttn_nm) === baseStopName(reportStop.appName))
      .map((candidate) => ({
        sttnId: String(candidate.sttn_id),
        sourceName: String(candidate.sttn_nm),
        arsNo: String(candidate.sttn_ars_no ?? ''),
        neighborhood: String(candidate.emd_nm ?? ''),
        approved: approvedIds.has(String(candidate.sttn_id)),
        usage: usageById[String(candidate.sttn_id)],
      }));
  }

  report.campuses[campusId] = {
    campusName: campus.name,
    route: config.route.map((stopId) => ({ stopId, name: campus.stops.find((stop) => stop.id === stopId)?.name })),
    directions: config.directions,
    stops: stopReports,
  };
}

await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`[directions] 후보 보고서: ${path.relative(projectRoot, reportPath)}`);
