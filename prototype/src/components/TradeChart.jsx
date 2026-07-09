import { useEffect, useRef, useState, useCallback } from 'react'
import { createChart, CandlestickSeries, ColorType } from 'lightweight-charts'
import './TradeChart.css'

// investment_journal 의 trade-chart 방식을 재현:
// lightweight-charts v5 캔들 + 매수/매도/관망 마커는 네이티브가 아닌
// DOM 오버레이(timeToCoordinate / priceToCoordinate 로 좌표 투영).
// 색은 전부 CSS 토큰(getComputedStyle)에서 읽어 하드코딩을 피한다.

const MARKER = {
  buy: { cls: 'buy', label: '매수', offset: 28 },
  sell: { cls: 'sell', label: '매도', offset: -28 },
  hold: { cls: 'hold', label: '관망', offset: 0 },
}

function tokens() {
  const s = getComputedStyle(document.documentElement)
  const v = (n) => s.getPropertyValue(n).trim()
  return {
    bg: v('--bg'),
    text: v('--text'),
    border: v('--border'),
    grid: v('--code-bg'),
    up: v('--up'),
    down: v('--down'),
  }
}

export default function TradeChart({
  entries = [],
  candles = [],
  readOnly = false,
  height = 420,
}) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef(null)
  const [markers, setMarkers] = useState([])

  const project = useCallback(() => {
    const chart = chartRef.current
    const series = seriesRef.current
    const container = containerRef.current
    if (!chart || !series || !container) return
    const h = container.clientHeight
    const next = []
    for (const e of entries) {
      const x = chart.timeScale().timeToCoordinate(e.entry_date)
      const y = series.priceToCoordinate(Number(e.price))
      if (x == null || y == null) continue
      const m = MARKER[e.entry_type] ?? MARKER.hold
      const clampedY = Math.max(14, Math.min(h - 14, y + m.offset))
      next.push({ id: e.id, x, y: clampedY, cls: m.cls, label: m.label })
    }
    setMarkers(next)
  }, [entries])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const applyTheme = (chart, series) => {
      const t = tokens()
      chart.applyOptions({
        layout: {
          background: { type: ColorType.Solid, color: t.bg },
          textColor: t.text,
          attributionLogo: false,
        },
        grid: {
          vertLines: { color: t.grid },
          horzLines: { color: t.grid },
        },
        rightPriceScale: { borderColor: t.border },
        timeScale: { borderColor: t.border, timeVisible: false },
        crosshair: { mode: 1 },
      })
      series.applyOptions({
        upColor: t.up,
        borderUpColor: t.up,
        wickUpColor: t.up,
        downColor: t.down,
        borderDownColor: t.down,
        wickDownColor: t.down,
      })
    }

    const chart = createChart(container, { autoSize: true, height })
    const series = chart.addSeries(CandlestickSeries, {})
    chartRef.current = chart
    seriesRef.current = series
    applyTheme(chart, series)
    series.setData(candles)
    chart.timeScale().fitContent()

    project()
    chart.timeScale().subscribeVisibleLogicalRangeChange(project)

    const ro = new ResizeObserver(() => project())
    ro.observe(container)

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onScheme = () => {
      applyTheme(chart, series)
      project()
    }
    mq.addEventListener('change', onScheme)

    return () => {
      mq.removeEventListener('change', onScheme)
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles, height])

  useEffect(() => {
    project()
  }, [project])

  return (
    <div
      className={`trade-chart${readOnly ? ' readonly' : ''}`}
      style={{ height }}
    >
      <div ref={containerRef} className="tc-canvas" />
      <div className="tc-markers">
        {markers.map((m) => (
          <div
            key={m.id}
            className={`tc-marker ${m.cls}`}
            style={{ left: `${m.x}px`, top: `${m.y}px` }}
            title={m.label}
          >
            <span className="tc-dot">
              {m.cls === 'buy' ? '▲' : m.cls === 'sell' ? '▼' : '⏸'}
            </span>
            <span className="tc-label">{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
