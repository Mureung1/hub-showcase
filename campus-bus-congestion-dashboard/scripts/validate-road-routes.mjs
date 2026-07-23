import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const campuses = JSON.parse(await readFile(resolve(root, 'src/data/live-campuses.json'), 'utf8'));
const manifest = JSON.parse(await readFile(resolve(root, 'src/data/generated-road-routes.json'), 'utf8'));
const targetCampusIds = ['knu-daegu', 'pnu-jangjeon', 'snu-gwanak', 'jejunu-ara', 'cbnu-gaesin', 'jnu-yongbong', 'jbnu-jeonju'];
const errors = [];

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

function nearestRouteDistance(stop, coordinates) {
  return Math.min(...coordinates.map(([lon, lat]) => distanceMeters(stop, { lat, lon })));
}

for (const campusId of targetCampusIds) {
  const campus = campuses.find((item) => item.id === campusId);
  const route = manifest.routes?.[campusId];
  if (!campus) {
    errors.push(`${campusId}: missing campus`);
    continue;
  }
  if (!route) {
    errors.push(`${campusId}: missing road route`);
    continue;
  }
  if (route.status !== 'ready') errors.push(`${campusId}: route status is ${route.status}`);
  if (route.source !== 'osrm' && route.source !== 'manual-osm') errors.push(`${campusId}: invalid route source ${route.source}`);
  if (route.profile !== 'driving') errors.push(`${campusId}: invalid route profile ${route.profile}`);
  if (route.distanceMeters <= 0) errors.push(`${campusId}: distance must be positive`);
  if (!Array.isArray(route.coordinates) || route.coordinates.length < 2) errors.push(`${campusId}: route must have at least two coordinates`);
  if (new Set(route.stopIds ?? []).size !== 3) errors.push(`${campusId}: stopIds must contain three unique IDs`);
  if ((route.stopIds ?? []).join('|') !== campus.stops.map((stop) => stop.id).join('|')) errors.push(`${campusId}: stopIds must match campus A-B-C order`);

  for (const coordinate of route.coordinates ?? []) {
    if (!Array.isArray(coordinate) || coordinate.length !== 2 || !coordinate.every(Number.isFinite)) {
      errors.push(`${campusId}: invalid route coordinate`);
      break;
    }
  }

  if (route.status === 'ready' && route.coordinates?.length > 1) {
    for (const stop of campus.stops) {
      const nearest = nearestRouteDistance(stop, route.coordinates);
      if (nearest > 250) errors.push(`${campusId}: route is ${Math.round(nearest)}m away from ${stop.name}`);
    }
    for (const distance of route.waypointDistancesMeters ?? []) {
      if (!Number.isFinite(distance) || distance > 250) errors.push(`${campusId}: waypoint snapped ${Math.round(distance)}m away from requested stop`);
    }
  }
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log(`[routes] 검증 성공: ${targetCampusIds.length}개 대학 실제 도로 경로`);
