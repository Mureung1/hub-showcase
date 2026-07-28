import http from 'k6/http'
import { check } from 'k6'
import { Counter } from 'k6/metrics'
import exec from 'k6/execution'

/*
 * T-15 오버셀 부하 테스트.
 *
 * 재고 N개짜리 딜에 동시에 M개의 예약 요청을 던져, 성공이 정확히 N건인지 확인한다.
 * 판정의 최종 근거는 이 스크립트의 카운터가 아니라 DB 상태다(verifyLoad.js).
 * 여기서는 "서버가 무엇을 응답했는가"를 기록한다.
 *
 * 실행:
 *   npm run seed:load -w server -- --stock=5 --users=50
 *   k6 run -e VUS=50 load/oversell.js
 *
 * 비교군(락 미적용)은 서버를 UNSAFE_STOCK=1 로 띄운 뒤 같은 명령을 실행한다.
 */

// seedLoad.js가 기록한 실제 dealId·userId를 읽는다.
// user id는 연속이 아니므로(시퀀스 소모) VU 번호를 그대로 쓰면 FK 위반이 난다.
const fixture = JSON.parse(open('./fixture.json'))

const BASE = __ENV.BASE_URL || 'http://localhost:4000'
const DEAL_ID = Number(__ENV.DEAL_ID || fixture.dealId)
const VUS = Number(__ENV.VUS || fixture.userIds.length)
const QTY = Number(__ENV.QTY || 1)

const created = new Counter('reservation_created')
const soldOut = new Counter('reservation_sold_out')
const failed = new Counter('reservation_failed')

export const options = {
  scenarios: {
    // 모든 VU가 동시에 1회씩만 — 순간 경합을 만든다
    burst: {
      executor: 'per-vu-iterations',
      vus: VUS,
      iterations: 1,
      maxDuration: '30s',
    },
  },
  // 요청이 몰려 일부가 409를 받는 것은 정상 동작이므로 실패율 임계값을 두지 않는다
  thresholds: {},
}

export function setup() {
  if (!Number.isInteger(DEAL_ID) || DEAL_ID <= 0) {
    throw new Error('dealId를 찾을 수 없습니다. 먼저 `npm run seed:load -w server` 를 실행하세요.')
  }
  if (VUS > fixture.userIds.length) {
    throw new Error(
      `유저가 부족합니다 (VUS=${VUS}, 유저=${fixture.userIds.length}명). ` +
        `--users=${VUS} 로 다시 시딩하세요.`,
    )
  }
  return { dealId: DEAL_ID }
}

export default function (data) {
  // VU마다 다른 사용자로 요청 (X-User-Id — 로그인 도입 전 임시 식별)
  const userId = fixture.userIds[exec.vu.idInTest - 1]

  const res = http.post(
    `${BASE}/api/reservations`,
    JSON.stringify({ dealId: data.dealId, qty: QTY }),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': String(userId),
      },
      tags: { name: 'POST /api/reservations' },
    },
  )

  if (res.status === 201) {
    created.add(1)
  } else if (res.status === 409) {
    soldOut.add(1)
  } else {
    failed.add(1)
    console.error(`예상 밖 응답 ${res.status}: ${res.body}`)
  }

  check(res, {
    '201 또는 409만 반환': (r) => r.status === 201 || r.status === 409,
  })
}

export function handleSummary(data) {
  const get = (name) => data.metrics[name]?.values?.count ?? 0
  const summary = {
    성공_201: get('reservation_created'),
    품절_409: get('reservation_sold_out'),
    기타실패: get('reservation_failed'),
    총요청: get('http_reqs'),
    p95_ms: Math.round(data.metrics.http_req_duration?.values?.['p(95)'] ?? 0),
  }

  return {
    stdout:
      '\n=== 예약 응답 집계 ===\n' +
      Object.entries(summary)
        .map(([k, v]) => `${k.padEnd(12)} ${v}`)
        .join('\n') +
      '\n\n최종 판정은 `npm run verify:load -w server` 의 DB 검증 결과를 따른다.\n',
    'load/summary.json': JSON.stringify(summary, null, 2),
  }
}
