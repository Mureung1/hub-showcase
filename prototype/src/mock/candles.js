// 목(mock) 일봉 데이터. 실제 API 대신 결정적으로 생성한다.
// 차트가 소비하는 형태: { time: "YYYY-MM-DD", open, high, low, close, volume }
// (investment_journal 의 Candle 형태와 동일)

// 2026-05-04 부터 평일만 생성 (주말 skip)
function buildDates(count) {
  const dates = []
  // 시작: 2026-05-04 (월)
  let y = 2026,
    m = 5,
    d = 4
  const daysInMonth = { 5: 31, 6: 30, 7: 31 }
  // 요일 계산용: 2026-05-04 는 월요일(dow=1)
  let dow = 1
  while (dates.length < count) {
    if (dow !== 0 && dow !== 6) {
      const mm = String(m).padStart(2, '0')
      const dd = String(d).padStart(2, '0')
      dates.push(`${y}-${mm}-${dd}`)
    }
    d += 1
    dow = (dow + 1) % 7
    if (d > daysInMonth[m]) {
      d = 1
      m += 1
    }
  }
  return dates
}

// 고정 델타 시퀀스(퍼센트). 결정적이라 매번 동일한 차트가 나온다.
const DELTAS = [
  0.012, -0.008, 0.021, 0.005, -0.015, 0.018, 0.009, -0.004, 0.027, -0.012,
  0.006, 0.014, -0.02, 0.031, -0.006, 0.011, -0.017, 0.008, 0.022, -0.009,
  0.004, 0.016, -0.011, 0.019, 0.007, -0.023, 0.013, 0.026, -0.005, 0.01,
  -0.014, 0.02, 0.003, -0.008, 0.017, 0.009, -0.019, 0.024, 0.006, -0.012,
  0.015, 0.028, -0.007, 0.011, -0.016,
]

function generate(basePrice, count) {
  const dates = buildDates(count)
  const candles = []
  let prevClose = basePrice
  for (let i = 0; i < count; i += 1) {
    const delta = DELTAS[i % DELTAS.length]
    const open = prevClose
    const close = Math.round(open * (1 + delta))
    const swing = Math.abs(delta) + 0.006
    const high = Math.round(Math.max(open, close) * (1 + swing / 2))
    const low = Math.round(Math.min(open, close) * (1 - swing / 2))
    const volume = 1_000_000 + ((i * 137) % 900) * 3000
    candles.push({ time: dates[i], open, high, low, close, volume })
    prevClose = close
  }
  return candles
}

export const CANDLES = {
  '005930': generate(74000, 50), // 삼성전자 (~2026-07-10 까지)
  NVDA: generate(880, 50),
  TSLA: generate(172, 50),
}

export function getCandles(symbol) {
  return CANDLES[symbol] ?? CANDLES['005930']
}
