import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_STOP_OPERATION_DATE, installCliErrorHandler, readOption } from './lib/data-config.mjs';
import { fetchAllPages, getServiceKey } from './lib/public-data-client.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const operationDate = readOption('date', process.env.BUS_STOP_OPR_YMD ?? DEFAULT_STOP_OPERATION_DATE);
const ctpvCd = readOption('ctpv', '');
const sggCds = readOption('sgg', '').split(',').map((value) => value.trim()).filter(Boolean);
const terms = readOption('terms', '').split(',').map((value) => value.trim()).filter(Boolean);
const endpoint = `${(process.env.BUS_STOP_API_BASE_URL?.trim() || 'https://apis.data.go.kr/1613000/BusStop').replace(/\/+$/, '')}/getBusStop`;

installCliErrorHandler('search-stops');
if (!ctpvCd || sggCds.length === 0 || terms.length === 0) throw new Error('--ctpv=52 --sgg=52111,52113 --terms=검색어 형식으로 입력하세요.');

const serviceKey = await getServiceKey(projectRoot);
const seen = new Set();

for (const sggCd of sggCds) {
  let stops = [];
  try {
    stops = await fetchAllPages({ endpoint, serviceKey, params: { opr_ymd: operationDate, ctpv_cd: ctpvCd, sgg_cd: sggCd } });
  } catch (error) {
    console.warn(`${sggCd}\tNO_DATA\t${error?.message ?? error}`);
    continue;
  }
  for (const stop of stops) {
    const name = String(stop.sttn_nm ?? '');
    const arsNo = String(stop.sttn_ars_no ?? '');
    const stopId = String(stop.sttn_id ?? '');
    if (!terms.some((term) => name.includes(term) || arsNo === term || stopId === term)) continue;
    const key = `${sggCd}:${stop.sttn_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    console.log(`${sggCd}\t${stop.sttn_id}\t${name}\t${arsNo}\t${stop.emd_nm ?? ''}`);
  }
}
