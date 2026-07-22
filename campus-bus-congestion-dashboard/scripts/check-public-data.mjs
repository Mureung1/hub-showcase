import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchAllPages, getServiceKey } from './lib/public-data-client.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const serviceKey = await getServiceKey(projectRoot);
const busStopBaseUrl = process.env.BUS_STOP_API_BASE_URL?.trim() || 'https://apis.data.go.kr/1613000/BusStop';
const tripVolumeBaseUrl = process.env.TRIP_VOLUME_API_BASE_URL?.trim() || 'https://apis.data.go.kr/1613000/TripVolumebyStop';

const checks = [
  {
    name: '정류장별 이용량',
    endpoint: `${tripVolumeBaseUrl.replace(/\/+$/, '')}/getMonthlyTripVolumebyStop`,
    params: {
      opr_ym: process.env.TRIP_VOLUME_OPR_YM ?? '202509',
      ctpv_cd: '29',
      sgg_cd: '29140',
      sttn_id: '00000058',
    },
  },
  {
    name: '버스정류장 매핑',
    endpoint: `${busStopBaseUrl.replace(/\/+$/, '')}/getBusStop`,
    params: {
      opr_ymd: process.env.BUS_STOP_OPR_YMD ?? '20250801',
      ctpv_cd: '29',
      sgg_cd: '29140',
      sttn_id: '00000058',
    },
  },
];

let failed = false;
for (const check of checks) {
  try {
    const items = await fetchAllPages({ ...check, serviceKey });
    console.log(`[check] ${check.name}: 정상 (${items.length}개 행)`);
  } catch (error) {
    failed = true;
    console.error(`[check] ${check.name}: 실패 - ${error?.message ?? error}`);
  }
}

if (failed) process.exitCode = 1;
