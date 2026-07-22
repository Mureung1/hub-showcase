import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_MONTH, DEFAULT_STOP_OPERATION_DATE, installCliErrorHandler } from './lib/data-config.mjs';
import { fetchAllPages, getServiceKey } from './lib/public-data-client.mjs';
import { aggregateMonthlyItems, findStopCandidates } from './lib/stop-usage.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportPath = path.join(projectRoot, 'reports/remaining-region-check.json');
const campusPath = path.join(projectRoot, 'src/data/live-campuses.json');
const regions = {
  'kangwon-chuncheon': { ctpvCd: '51', sggCd: '51110', label: '강원특별자치도 춘천시', terms: ['강원대'] },
  'gnu-gajwa': { ctpvCd: '48', sggCd: '48170', label: '경상남도 진주시', terms: ['가좌주공그린빌', '경상국립대학교'] },
  'snu-gwanak': { ctpvCd: '11', sggCd: '11620', label: '서울특별시 관악구', terms: ['서울대입구역', '서울대정문', '관악사삼거리'] },
  'jbnu-jeonju': { ctpvCd: '52', sggCd: '52113', label: '전북특별자치도 전주시 덕진구', terms: ['전북은행', '전북대학교', '덕진성당', '소나무', '한나'] },
  'cbnu-gaesin': { ctpvCd: '43', sggCd: '43112', label: '충청북도 청주시 서원구', terms: ['충북대학교'] },
};

installCliErrorHandler('remaining-regions');
const serviceKey = await getServiceKey(projectRoot);
const campuses = await readFile(campusPath, 'utf8').then(JSON.parse);
const busStopEndpoint = `${(process.env.BUS_STOP_API_BASE_URL?.trim() || 'https://apis.data.go.kr/1613000/BusStop').replace(/\/+$/, '')}/getBusStop`;
const usageEndpoint = `${(process.env.TRIP_VOLUME_API_BASE_URL?.trim() || 'https://apis.data.go.kr/1613000/TripVolumebyStop').replace(/\/+$/, '')}/getMonthlyTripVolumebyStop`;
const month = process.env.TRIP_VOLUME_OPR_YM ?? DEFAULT_MONTH;
const operationDate = process.env.BUS_STOP_OPR_YMD ?? DEFAULT_STOP_OPERATION_DATE;
const report = { schemaVersion: 1, month, operationDate, generatedAt: new Date().toISOString(), campuses: {} };

for (const [campusId, region] of Object.entries(regions)) {
  const campus = campuses.find((entry) => entry.id === campusId);
  console.log(`[regions] ${campus.name}: ${region.label} 확인`);
  const publicStops = await fetchAllPages({
    endpoint: busStopEndpoint,
    serviceKey,
    params: { opr_ymd: operationDate, ctpv_cd: region.ctpvCd, sgg_cd: region.sggCd },
  });
  const stops = {};
  for (const stop of campus.stops) {
    const { exact, ranked } = findStopCandidates(stop.name, publicStops);
    const usageChecks = [];
    for (const candidate of exact) {
      const items = await fetchAllPages({
        endpoint: usageEndpoint,
        serviceKey,
        params: {
          opr_ym: month,
          ctpv_cd: region.ctpvCd,
          sgg_cd: region.sggCd,
          sttn_id: candidate.sttn_id,
        },
      });
      const usage = aggregateMonthlyItems(items);
      usageChecks.push({
        sttnId: String(candidate.sttn_id),
        sourceName: String(candidate.sttn_nm),
        arsNo: String(candidate.sttn_ars_no ?? ''),
        itemCount: items.length,
        monthlyTotal: usage.totals.reduce((sum, value) => sum + value, 0),
      });
    }
    stops[stop.id] = {
      appName: stop.name,
      exactCount: exact.length,
      usageChecks,
      candidates: ranked.map((candidate) => ({
        sttnId: String(candidate.sttn_id ?? ''),
        sourceName: String(candidate.sttn_nm ?? ''),
        arsNo: String(candidate.sttn_ars_no ?? ''),
        neighborhood: String(candidate.emd_nm ?? ''),
        similarity: Number(candidate.similarity.toFixed(3)),
      })),
    };
  }
  const keywordMatches = publicStops
    .filter((candidate) => region.terms.some((term) => String(candidate.sttn_nm ?? '').includes(term)))
    .map((candidate) => ({
      sttnId: String(candidate.sttn_id ?? ''),
      sourceName: String(candidate.sttn_nm ?? ''),
      arsNo: String(candidate.sttn_ars_no ?? ''),
      neighborhood: String(candidate.emd_nm ?? ''),
    }));
  report.campuses[campusId] = { campusName: campus.name, region, publicStopCount: publicStops.length, keywordMatches, stops };
}

await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`[regions] 결과: ${path.relative(projectRoot, reportPath)}`);
