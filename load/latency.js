import http from 'k6/http'
import { check } from 'k6'
import { Trend } from 'k6/metrics'

/*
 * 기능별 응답 지연 측정 (배포 환경 모니터링).
 *
 * 오버셀 테스트(oversell.js)가 "동시에 몰릴 때 정확한가"를 본다면,
 * 이 스크립트는 "평소 한 명이 쓸 때 얼마나 걸리는가"를 본다.
 *
 * 각 엔드포인트를 순서대로 호출해 p50/p95를 낸다. VU 1이 기본이라
 * 부하가 아니라 순수 지연을 잰다 — 배포 후 체감 속도를 수치로 확인하는 용도.
 *
 * 실행:
 *   k6 run -e BASE_URL=https://hub-2bxa.onrender.com load/latency.js
 *   k6 run -e BASE_URL=... -e ITER=30 load/latency.js
 *
 * 로컬과 비교하려면:
 *   k6 run -e BASE_URL=http://localhost:4000 load/latency.js
 */

const BASE = __ENV.BASE_URL || 'http://localhost:4000'
const ITER = Number(__ENV.ITER || 20)
const USER = __ENV.USER_ID || '4'

// 엔드포인트별로 따로 집계해야 어디가 느린지 보인다
const t = {
  health: new Trend('ep_health', true),
  nearby: new Trend('ep_deals_nearby', true),
  detail: new Trend('ep_deal_detail', true),
  myRsv: new Trend('ep_my_reservations', true),
  noti: new Trend('ep_notifications', true),
  pool: new Trend('ep_demo_pool', true),
}

export const options = {
  scenarios: {
    latency: { executor: 'per-vu-iterations', vus: 1, iterations: ITER, maxDuration: '5m' },
  },
  thresholds: {
    // 시연 체감 기준: 대부분 요청이 1초 안에 끝나야 한다
    'ep_deals_nearby': ['p(95)<1000'],
    'ep_health': ['p(95)<1000'],
  },
}

const H = { headers: { 'X-User-Id': USER } }

export default function () {
  let res = http.get(`${BASE}/api/health`, { tags: { name: 'health' } })
  t.health.add(res.timings.duration)
  check(res, { 'health 200': (r) => r.status === 200 })

  res = http.get(`${BASE}/api/deals/nearby`, { ...H, tags: { name: 'nearby' } })
  t.nearby.add(res.timings.duration)
  check(res, { 'nearby 200': (r) => r.status === 200 })

  // 목록의 첫 딜로 상세를 본다 (없으면 건너뜀)
  let dealId = null
  try {
    const list = res.json()
    if (Array.isArray(list) && list.length > 0) dealId = list[0].id
  } catch {
    // 무시 — 상세 측정만 건너뛴다
  }
  if (dealId) {
    res = http.get(`${BASE}/api/deals/${dealId}`, { ...H, tags: { name: 'detail' } })
    t.detail.add(res.timings.duration)
  }

  res = http.get(`${BASE}/api/reservations/me`, { ...H, tags: { name: 'myRsv' } })
  t.myRsv.add(res.timings.duration)

  res = http.get(`${BASE}/api/notifications`, { ...H, tags: { name: 'noti' } })
  t.noti.add(res.timings.duration)

  res = http.get(`${BASE}/api/demo/pool`, { tags: { name: 'pool' } })
  t.pool.add(res.timings.duration)
}

export function handleSummary(data) {
  const rows = [
    ['헬스체크 (DB 미사용)', 'ep_health'],
    ['근처 딜 목록', 'ep_deals_nearby'],
    ['딜 상세', 'ep_deal_detail'],
    ['내 예약', 'ep_my_reservations'],
    ['알림 목록', 'ep_notifications'],
    ['풀 현황', 'ep_demo_pool'],
  ]

  const ms = (n) => (n == null ? '-' : String(Math.round(n)).padStart(6))
  let out = `\n=== 기능별 응답 지연 (${BASE}, ${ITER}회) ===\n`
  out += `${'엔드포인트'.padEnd(24)}${'p50'.padStart(7)}${'p95'.padStart(8)}${'최소'.padStart(8)}${'최대'.padStart(8)}\n`
  out += '-'.repeat(56) + '\n'

  const json = {}
  for (const [label, metric] of rows) {
    const v = data.metrics[metric]?.values
    if (!v) continue
    out += `${label.padEnd(24)}${ms(v.med)}${ms(v['p(95)'])}${ms(v.min)}${ms(v.max)}\n`
    json[label] = { p50: Math.round(v.med), p95: Math.round(v['p(95)']), max: Math.round(v.max) }
  }

  // 네트워크 왕복 자체가 얼마인지 — 서버 처리와 구분하는 기준선
  const conn = data.metrics.http_req_connecting?.values
  const tls = data.metrics.http_req_tls_handshaking?.values
  const wait = data.metrics.http_req_waiting?.values
  out += '\n' + `참고: TCP연결 평균 ${ms(conn?.avg)}ms · TLS ${ms(tls?.avg)}ms · 서버대기(TTFB) 평균 ${ms(wait?.avg)}ms\n`

  return {
    stdout: out,
    'load/latency-summary.json': JSON.stringify(
      { base: BASE, at: new Date().toISOString(), endpoints: json },
      null,
      2,
    ),
  }
}
