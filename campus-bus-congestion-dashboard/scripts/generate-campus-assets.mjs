import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = resolve(root, 'src/data/live-campuses.json');
const campuses = JSON.parse(await readFile(manifestPath, 'utf8'));
const headers = { 'User-Agent': 'CampusFlow/0.1 (campus boundary asset generator)' };
const generatedOn = new Date().toISOString().slice(0, 10);
const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

function escapeXml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function viewportFor(campus) {
  const [south, north, west, east] = campus.boundary.bounds;
  const lats = [south, north, ...campus.stops.map((stop) => stop.lat)];
  const lons = [west, east, ...campus.stops.map((stop) => stop.lon)];
  return { south: Math.min(...lats), north: Math.max(...lats), west: Math.min(...lons), east: Math.max(...lons) };
}

function project([lon, lat], viewport) {
  const x = 72 + ((lon - viewport.west) / (viewport.east - viewport.west || 1)) * 1056;
  const y = 72 + ((viewport.north - lat) / (viewport.north - viewport.south || 1)) * 756;
  return [x, y];
}

function ringToPath(ring, viewport) {
  return ring.map((point, index) => {
    const [x, y] = project(point, viewport);
    return `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ') + ' Z';
}

function geometryToPath(geometry, viewport) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons.flatMap((polygon) => polygon.map((ring) => ringToPath(ring, viewport))).join(' ');
}

function stopSourceLine(stop) {
  const osmUrl = `https://www.openstreetmap.org/${stop.osmType}/${stop.osmId}`;
  const coordinateReference = `좌표 기준: OSM ${stop.osmType} ${stop.osmId} | ${stop.lat}, ${stop.lon} | ${osmUrl}`;
  if (stop.verification?.kind === 'official-route') {
    return `- ${stop.name} | 공식 순환버스 정류장 | 검증: ${stop.verification.label} | ${stop.verification.url} | ${coordinateReference}`;
  }
  return `- ${stop.name} | OSM ${stop.osmType} ${stop.osmId} | ${stop.lat}, ${stop.lon} | ${osmUrl}`;
}

async function fetchBoundary(campus) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.search = new URLSearchParams({ format: 'jsonv2', limit: '20', polygon_geojson: '1', q: campus.boundary.query });
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${campus.id}: Nominatim ${response.status}`);
  const results = await response.json();
  const match = results.find((item) => item.osm_type === campus.boundary.osmType && Number(item.osm_id) === campus.boundary.osmId);
  if (!match || !['Polygon', 'MultiPolygon'].includes(match.geojson?.type)) throw new Error(`${campus.id}: configured boundary was not returned`);
  return match.geojson;
}

for (const campus of campuses) {
  const geometry = await fetchBoundary(campus);
  const viewport = viewportFor(campus);
  const path = geometryToPath(geometry, viewport);
  const outputDirectory = resolve(root, 'public/campuses', campus.id);
  await mkdir(outputDirectory, { recursive: true });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(campus.name)} 경계</title>
  <desc id="desc">OpenStreetMap 공개 데이터에서 가져온 ${escapeXml(campus.name)} 외곽선</desc>
  <rect width="1200" height="900" rx="54" fill="#f5faf6"/>
  <path d="${path}" fill="#d8ecda" fill-rule="evenodd" stroke="#4b9460" stroke-width="10" stroke-linejoin="round"/>
  <text x="600" y="836" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="26" font-weight="700" fill="#496255">${escapeXml(campus.name)}</text>
  <text x="1128" y="870" text-anchor="end" font-family="Arial, sans-serif" font-size="17" fill="#6b7c71">© OpenStreetMap contributors · ODbL 1.0</text>
</svg>
`;

  const boundaryUrl = `https://www.openstreetmap.org/${campus.boundary.osmType}/${campus.boundary.osmId}`;
  const source = [
    `${campus.name} 지도 자산 출처`,
    '',
    `경계 파일: boundary.svg`,
    `경계 객체: ${campus.boundary.osmType} ${campus.boundary.osmId}`,
    `경계 URL: ${boundaryUrl}`,
    `검색어: ${campus.boundary.query}`,
    '',
    '표시 정류장:',
    ...campus.stops.map(stopSourceLine),
    '',
    '데이터: OpenStreetMap contributors',
    '라이선스: Open Database License (ODbL) 1.0',
    '저작권 안내: https://www.openstreetmap.org/copyright',
    `자산 생성일: ${generatedOn}`,
    '',
  ].join('\n');

  await writeFile(resolve(outputDirectory, 'boundary.svg'), svg, 'utf8');
  await writeFile(resolve(outputDirectory, 'SOURCE.txt'), source, 'utf8');
  await sleep(1200);
}

console.log(`Generated ${campuses.length} campus boundary assets.`);
