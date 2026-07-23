import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_STOP_OPERATION_DATE, installCliErrorHandler, readOption, SUPPORTED_CAMPUS_REGIONS } from './lib/data-config.mjs';
import { fetchAllPages, getServiceKey } from './lib/public-data-client.mjs';
import { stopNameSimilarity } from './lib/stop-usage.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const campusPath = path.join(projectRoot, 'src/data/live-campuses.json');
const reportPath = path.join(projectRoot, 'reports/nearby-stop-candidates.json');
const operationDate = readOption('date', process.env.BUS_STOP_OPR_YMD ?? DEFAULT_STOP_OPERATION_DATE);
const campusFilter = readOption('campus', '');
const limit = Number(readOption('limit', '12'));
const endpoint = `${(process.env.BUS_STOP_API_BASE_URL?.trim() || 'https://apis.data.go.kr/1613000/BusStop').replace(/\/+$/, '')}/getBusStop`;

installCliErrorHandler('nearby');
const serviceKey = await getServiceKey(projectRoot);
const campuses = await readFile(campusPath, 'utf8').then(JSON.parse);

const coordinatePairs = [
  ['lat', 'lon'],
  ['lat', 'lot'],
  ['latitude', 'longitude'],
  ['sttn_lat', 'sttn_lon'],
  ['sttn_lat', 'sttn_lot'],
  ['gps_lati', 'gps_long'],
  ['gps_lati', 'gps_loti'],
  ['y_crdnt', 'x_crdnt'],
  ['ycrd', 'xcrd'],
];

function valueFor(item, name) {
  return item?.[name] ?? item?.[name.toUpperCase()] ?? item?.[name.replaceAll('_', '')];
}

function coordinateOf(item) {
  for (const [latKey, lonKey] of coordinatePairs) {
    const lat = Number(valueFor(item, latKey));
    const lon = Number(valueFor(item, lonKey));
    if (Number.isFinite(lat) && Number.isFinite(lon) && lat >= 30 && lat <= 40 && lon >= 120 && lon <= 135) return { lat, lon, latKey, lonKey };
  }
  return null;
}

function distanceMeters(a, b) {
  const radius = 6371000;
  const toRadians = (value) => value * Math.PI / 180;
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(h));
}

const report = { schemaVersion: 1, operationDate, generatedAt: new Date().toISOString(), campuses: {} };

for (const campus of campuses) {
  if (campusFilter && campus.id !== campusFilter) continue;
  const region = SUPPORTED_CAMPUS_REGIONS[campus.id];
  if (!region) continue;
  console.log(`[nearby] ${campus.name}: ${region.label} 정류장 조회`);
  const publicStops = await fetchAllPages({
    endpoint,
    serviceKey,
    params: { opr_ymd: operationDate, ctpv_cd: region.ctpvCd, sgg_cd: region.sggCd },
  });
  const geocodedStops = publicStops
    .map((candidate) => ({ candidate, coordinate: coordinateOf(candidate) }))
    .filter((entry) => entry.coordinate);

  report.campuses[campus.id] = {
    campusName: campus.name,
    region,
    publicStopCount: publicStops.length,
    geocodedStopCount: geocodedStops.length,
    sampleKeys: Object.keys(publicStops[0] ?? {}),
    stops: Object.fromEntries(campus.stops.map((stop) => {
      const ranked = geocodedStops
        .map(({ candidate, coordinate }) => ({
          sttnId: String(candidate.sttn_id ?? ''),
          sourceName: String(candidate.sttn_nm ?? ''),
          arsNo: String(candidate.sttn_ars_no ?? ''),
          neighborhood: String(candidate.emd_nm ?? ''),
          lat: coordinate.lat,
          lon: coordinate.lon,
          coordinateKeys: [coordinate.latKey, coordinate.lonKey],
          distanceMeters: Math.round(distanceMeters(stop, coordinate)),
          similarity: Number(stopNameSimilarity(stop.name, candidate.sttn_nm).toFixed(3)),
        }))
        .sort((a, b) => a.distanceMeters - b.distanceMeters || b.similarity - a.similarity)
        .slice(0, limit);
      return [stop.id, { appName: stop.name, appLat: stop.lat, appLon: stop.lon, candidates: ranked }];
    })),
  };
}

await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`[nearby] 후보 보고서: ${path.relative(projectRoot, reportPath)}`);
