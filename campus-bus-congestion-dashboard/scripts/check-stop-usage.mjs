import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertMonth, DEFAULT_MONTH, installCliErrorHandler, readOption } from './lib/data-config.mjs';
import { fetchAllPages, getServiceKey } from './lib/public-data-client.mjs';
import { aggregateMonthlyItems } from './lib/stop-usage.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const month = readOption('month', process.env.TRIP_VOLUME_OPR_YM ?? DEFAULT_MONTH);
const ctpvCd = readOption('ctpv', '');
const sggCd = readOption('sgg', '');
const ids = readOption('ids', '').split(',').map((value) => value.trim()).filter(Boolean);
const endpoint = `${(process.env.TRIP_VOLUME_API_BASE_URL?.trim() || 'https://apis.data.go.kr/1613000/TripVolumebyStop').replace(/\/+$/, '')}/getMonthlyTripVolumebyStop`;

installCliErrorHandler('check-usage');
assertMonth(month);
if (!ctpvCd || !sggCd || ids.length === 0) throw new Error('--ctpv, --sgg, --ids=id1,id2 형식으로 입력하세요.');

const serviceKey = await getServiceKey(projectRoot);
const mappingPath = path.join(projectRoot, 'src/data/public-stop-mappings.json');
const mapping = await readFile(mappingPath, 'utf8').then(JSON.parse);
const knownNames = Object.values(mapping.mappings ?? {}).flatMap((entry) => [
  { sttnId: entry.sttnId, sourceName: entry.sourceName },
  ...Object.values(entry.directions ?? {}),
]).reduce((result, entry) => ({ ...result, [entry.sttnId]: entry.sourceName }), {});

for (const id of ids) {
  try {
    const items = await fetchAllPages({ endpoint, serviceKey, params: { opr_ym: month, ctpv_cd: ctpvCd, sgg_cd: sggCd, sttn_id: id } });
    const usage = aggregateMonthlyItems(items);
    const monthlyTotal = usage.totals.reduce((sum, value) => sum + value, 0);
    const peakTotal = Math.max(...usage.totals);
    const peakHour = usage.totals.indexOf(peakTotal);
    console.log(`${id}\t${knownNames[id] ?? ''}\titems=${items.length}\ttotal=${monthlyTotal}\tpeak=${peakHour}:00/${peakTotal}`);
  } catch (error) {
    console.log(`${id}\t${knownNames[id] ?? ''}\tERROR\t${error?.message ?? error}`);
  }
}
