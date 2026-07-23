import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = resolve(root, 'src/data/live-campuses.json');
const outputPath = resolve(root, 'src/data/generated-road-routes.json');
const targetCampusIds = new Set(['knu-daegu', 'pnu-jangjeon', 'snu-gwanak', 'jejunu-ara', 'cbnu-gaesin', 'jnu-yongbong', 'jbnu-jeonju']);
const osrmBaseUrl = (process.env.OSRM_BASE_URL ?? 'https://router.project-osrm.org').replace(/\/$/, '');
const profile = 'driving';
const headers = { 'User-Agent': 'CampusFlow/0.1 (static road route generator; contact: local development)' };
const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

function routeUrl(stops) {
  const coordinates = stops.map((stop) => `${stop.lon},${stop.lat}`).join(';');
  return `${osrmBaseUrl}/route/v1/${profile}/${coordinates}?overview=full&geometries=geojson&steps=false&alternatives=false&generate_hints=false`;
}

function waypointDistances(response) {
  return response.waypoints?.map((waypoint) => Number(waypoint.distance ?? 0)) ?? [];
}

async function fetchRoute(campus) {
  const stops = campus.stops;
  if (stops.length !== 3 || stops.some((stop) => !Number.isFinite(stop.lat) || !Number.isFinite(stop.lon))) {
    return {
      status: 'error',
      source: 'osrm',
      profile,
      fetchedAt: new Date().toISOString(),
      stopIds: stops.map((stop) => stop.id),
      coordinates: [],
      distanceMeters: 0,
      message: 'campus must have exactly three geocoded stops',
    };
  }

  try {
    const response = await fetch(routeUrl(stops), { headers });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.code !== 'Ok' || !payload.routes?.[0]?.geometry?.coordinates) {
      return {
        status: payload.code === 'NoRoute' ? 'no-route' : 'error',
        source: 'osrm',
        profile,
        fetchedAt: new Date().toISOString(),
        stopIds: stops.map((stop) => stop.id),
        coordinates: [],
        distanceMeters: 0,
        message: payload.message ?? `OSRM ${response.status}`,
      };
    }

    const route = payload.routes[0];
    return {
      status: 'ready',
      source: 'osrm',
      profile,
      fetchedAt: new Date().toISOString(),
      stopIds: stops.map((stop) => stop.id),
      coordinates: route.geometry.coordinates,
      distanceMeters: Math.round(Number(route.distance ?? 0)),
      waypointDistancesMeters: waypointDistances(payload),
    };
  } catch (error) {
    return {
      status: 'error',
      source: 'osrm',
      profile,
      fetchedAt: new Date().toISOString(),
      stopIds: stops.map((stop) => stop.id),
      coordinates: [],
      distanceMeters: 0,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

const campuses = JSON.parse(await readFile(manifestPath, 'utf8'));
const routes = {};

for (const campus of campuses.filter((item) => targetCampusIds.has(item.id))) {
  routes[campus.id] = await fetchRoute(campus);
  await sleep(1100);
}

await writeFile(outputPath, `${JSON.stringify({
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: osrmBaseUrl,
  profile,
  routes,
}, null, 2)}\n`, 'utf8');

const readyCount = Object.values(routes).filter((route) => route.status === 'ready').length;
console.log(`[routes] ${readyCount}/${targetCampusIds.size}개 대학 도로 경로 생성`);
