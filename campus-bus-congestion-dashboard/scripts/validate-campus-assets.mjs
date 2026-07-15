import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const campuses = JSON.parse(await readFile(resolve(root, 'src/data/live-campuses.json'), 'utf8'));
const errors = [];
const expectedStops = new Map([
  ['kangwon-chuncheon', ['강원대정문', '강원대중앙도서관', '강원대후문']],
  ['pnu-jangjeon', ['부산대정문', '부산대역', '새벽벌도서관']],
]);

if (campuses.length !== 10) errors.push(`expected 10 campuses, found ${campuses.length}`);

for (const campus of campuses) {
  const directory = resolve(root, 'public/campuses', campus.id);
  if (campus.stops.length !== 3) errors.push(`${campus.id}: expected 3 stops, found ${campus.stops.length}`);
  if (new Set(campus.stops.map((stop) => stop.id)).size !== 3) errors.push(`${campus.id}: stop IDs must be unique`);
  const expectedNames = expectedStops.get(campus.id);
  if (expectedNames && campus.stops.map((stop) => stop.name).join('|') !== expectedNames.join('|')) errors.push(`${campus.id}: unexpected stop order or names`);
  if (!campus.boundary.osmId || !campus.boundary.osmType) errors.push(`${campus.id}: missing OSM boundary identity`);
  for (const filename of ['boundary.svg', 'SOURCE.txt']) {
    try { await access(resolve(directory, filename)); } catch { errors.push(`${campus.id}: missing ${filename}`); }
  }
  for (const stop of campus.stops) {
    const validCoordinateReference = stop.osmType === 'node' || stop.osmType === 'way';
    if (!stop.osmId || !validCoordinateReference || !Number.isFinite(stop.lat) || !Number.isFinite(stop.lon)) errors.push(`${campus.id}: invalid stop ${stop.id}`);
    if (!stop.verification && stop.osmType !== 'node') errors.push(`${campus.id}: non-node stop ${stop.id} requires official verification`);
    if (stop.verification && (stop.verification.kind !== 'official-route' || !stop.verification.label || !stop.verification.url?.startsWith('https://'))) errors.push(`${campus.id}: invalid official verification for ${stop.id}`);
  }
  try {
    const source = await readFile(resolve(directory, 'SOURCE.txt'), 'utf8');
    if (!source.includes('Open Database License (ODbL) 1.0')) errors.push(`${campus.id}: source file lacks ODbL notice`);
    for (const stop of campus.stops) {
      if (!source.includes(String(stop.osmId))) errors.push(`${campus.id}: source file lacks stop ${stop.osmId}`);
      if (stop.verification && !source.includes(stop.verification.url)) errors.push(`${campus.id}: source file lacks official verification for ${stop.id}`);
    }
  } catch {}
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log(`Validated ${campuses.length} campuses: one boundary, three stops, and one source file each.`);
