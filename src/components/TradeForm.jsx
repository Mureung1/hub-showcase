import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { SETUP_TAGS, EMOTIONS } from '../lib/tradeMeta.js'
import './TradeForm.css'

const SIDE_LABEL = { buy: '매수', sell: '매도', hold: '관망' }
const SIDES = ['buy', 'sell', 'hold']

// KR 장마감 15:30 KST(UTC+9, DST 없음) → UTC 06:30 고정
const KR_CLOSE_UTC_HOUR = 6
const KR_CLOSE_UTC_MINUTE = 30

function krMarketCloseIso(dateStr) {
  const hh = String(KR_CLOSE_UTC_HOUR).padStart(2, '0')
  const mm = String(KR_CLOSE_UTC_MINUTE).padStart(2, '0')
  return `${dateStr}T${hh}:${mm}:00.000Z`
}

/**
 * America/New_York 기준 해당 날짜의 UTC 오프셋(시간)을 Intl로 근사 계산.
 * 서머타임(EDT -4 / EST -5) 전환은 브라우저 ICU 타임존 데이터에 의존하는 근사치이며,
 * 정오(UTC 12:00) 기준으로 조회해 자정 전후 날짜 경계 오차를 피한다.
 */
function nyUtcOffsetHours(dateStr) {
  try {
    const probe = new Date(`${dateStr}T12:00:00.000Z`)
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      timeZoneName: 'shortOffset',
    }).formatToParts(probe)
    const tzName = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT-5'
    const match = /GMT([+-]\d+)/.exec(tzName)
    return match ? parseInt(match[1], 10) : -5
  } catch {
    return -5 // Intl shortOffset 미지원 환경 폴백: EST 가정
  }
}

// US 장마감 16:00 America/New_York → UTC 환산(서머타임 근사 반영)
function usMarketCloseIso(dateStr) {
  const offsetHours = nyUtcOffsetHours(dateStr)
  const utcHour = 16 - offsetHours
  const d = new Date(`${dateStr}T00:00:00.000Z`)
  d.setUTCHours(utcHour, 0, 0, 0)
  return d.toISOString()
}

function marketCloseIso(dateStr, market) {
  return market === 'US' ? usMarketCloseIso(dateStr) : krMarketCloseIso(dateStr)
}

/**
 * 매매 기록 폼: 3-way 매수/매도/관망 + 가격/수량/메모 → trades insert.
 * StockPage 우측 사이드 패널에서 인라인으로도, 차트 클릭 시 모달로도 쓰인다. Supabase insert는
 * ConditionForm과 동일한 관례(폼이 스스로 저장하고 결과를 콜백으로 전달)를 따라 이 컴포넌트가 담당한다.
 *
 * @param {object} symbolMeta 기록 대상 종목 {ticker, market, exchange?, name?}
 * @param {number|string|null} [defaultPrice] 현재가/봉 종가 프리필 값 — 가격 입력이 비어있을 때만 채운다
 *   (사용자가 이미 값을 입력/수정했다면 이후 defaultPrice가 바뀌어도 덮어쓰지 않는다).
 * @param {(trade: object) => void} [onSaved] 저장 성공 후 호출(insert된 trades row 전달).
 *   호출부가 목록 갱신(예: loadRecords 재호출) 등 후처리를 여기서 수행한다.
 * @param {'inline'|'modal'} [variant] 스타일 변형. 'modal'이면 오버레이+카드로 렌더링된다(차트 클릭 기록, WP-C).
 * @param {{date: string, min?: string, max?: string, editable?: boolean, rangeLabel?: string}} [dateContext]
 *   차트 클릭으로 열렸을 때만 전달. 있으면 `traded_at`을 그 날짜의 장마감 시각(KR 15:30 KST / US 16:00 ET)으로
 *   계산해 저장한다 — 없으면(기존 인라인 사용) 기존처럼 `now()`를 사용한다.
 *   `editable=true`면 날짜 입력(min/max 범위 제한)을 보여주고(주/월/년봉 — 봉이 기간을 대표하므로 일자 확정 필요),
 *   `editable=false`면 확정된 날짜를 읽기 전용으로 표시한다(일봉 — 이미 날짜가 확정돼 있어 선택 불필요).
 * @param {() => void} [onClose] 모달 닫기 콜백(변형이 'modal'일 때만 사용) — 오버레이 클릭·닫기 버튼·Esc에서 호출.
 */
export default function TradeForm({
  symbolMeta,
  defaultPrice,
  onSaved,
  variant = 'inline',
  dateContext,
  onClose,
}) {
  const [side, setSide] = useState('buy')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [memo, setMemo] = useState('')
  const [tags, setTags] = useState([])
  const [emotion, setEmotion] = useState(null)
  const [tradedDate, setTradedDate] = useState(dateContext?.date ?? null)
  const [recording, setRecording] = useState(false)
  const [recordError, setRecordError] = useState('')

  function toggleTag(tag) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  // 현재가/봉 종가 프리필: 사용자가 아직 가격을 입력하지 않았을 때만 채운다
  useEffect(() => {
    if (defaultPrice != null) setPrice((prev) => (prev === '' ? String(defaultPrice) : prev))
  }, [defaultPrice])

  // 모달일 때: Esc로 닫기 + 배경 스크롤 잠금
  useEffect(() => {
    if (variant !== 'modal') return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [variant, onClose])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!supabase || !symbolMeta) return
    setRecordError('')
    if (!price) {
      setRecordError('가격을 입력하세요.')
      return
    }
    if (dateContext && !tradedDate) {
      setRecordError('기록 일자를 선택하세요.')
      return
    }
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id
    if (!userId) {
      setRecordError('로그인이 필요합니다.')
      return
    }

    const tradedAt = dateContext ? marketCloseIso(tradedDate, symbolMeta.market) : new Date().toISOString()

    setRecording(true)
    const { data, error } = await supabase
      .from('trades')
      .insert({
        user_id: userId,
        ticker: symbolMeta.ticker,
        market: symbolMeta.market,
        side,
        price: Number(price),
        quantity: quantity ? Number(quantity) : null,
        memo: memo || null,
        tags: tags.length ? tags : [],
        emotion: emotion || null,
        traded_at: tradedAt,
        source: 'manual',
      })
      .select()
      .single()
    setRecording(false)

    if (error) {
      console.error('[TradeForm] 매매 기록 저장 실패:', error)
      setRecordError('기록을 저장하지 못했습니다.')
      return
    }
    setQuantity('')
    setMemo('')
    setTags([])
    setEmotion(null)
    onSaved?.(data)
  }

  const formEl = (
    <form
      className={variant === 'modal' ? 'card trade-form trade-form--modal' : 'card trade-form'}
      onSubmit={handleSubmit}
    >
      {variant === 'modal' ? (
        <div className="trade-form__modal-head">
          <div>
            <div className="trade-form__title">차트에서 기록 추가</div>
            {dateContext?.rangeLabel && <p className="trade-form__modal-sub">{dateContext.rangeLabel}</p>}
          </div>
          {onClose && (
            <button type="button" className="trade-form__close" onClick={onClose} aria-label="닫기">
              ×
            </button>
          )}
        </div>
      ) : (
        <div className="trade-form__title">매매 기록</div>
      )}

      {dateContext && (
        <label className="trade-form__field">
          <span>기록 일자</span>
          {dateContext.editable ? (
            <input
              type="date"
              value={tradedDate ?? ''}
              min={dateContext.min}
              max={dateContext.max}
              onChange={(e) => setTradedDate(e.target.value)}
              required
            />
          ) : (
            <div className="mono trade-form__date-readonly">{tradedDate}</div>
          )}
        </label>
      )}

      <div className="trade-form__side">
        {SIDES.map((s) => (
          <button
            key={s}
            type="button"
            className={
              s === side ? `trade-side-btn trade-side-btn--${s} is-active` : `trade-side-btn trade-side-btn--${s}`
            }
            onClick={() => setSide(s)}
          >
            {SIDE_LABEL[s]}
          </button>
        ))}
      </div>
      <label className="trade-form__field">
        <span>가격</span>
        <input type="number" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
      </label>
      <label className="trade-form__field">
        <span>수량 (선택)</span>
        <input type="number" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      </label>
      <label className="trade-form__field">
        <span>메모 (선택)</span>
        <textarea rows={2} value={memo} onChange={(e) => setMemo(e.target.value)} />
      </label>
      <div className="trade-form__field">
        <span>셋업 태그 (선택)</span>
        <div className="trade-form__tags">
          {SETUP_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              className={tags.includes(tag) ? 'trade-tag-btn is-active' : 'trade-tag-btn'}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
      <div className="trade-form__field">
        <span>감정 상태 (선택)</span>
        <div className="trade-form__emotions">
          {EMOTIONS.map((e) => (
            <button
              key={e.value}
              type="button"
              className={emotion === e.value ? 'trade-emotion-btn is-active' : 'trade-emotion-btn'}
              onClick={() => setEmotion((prev) => (prev === e.value ? null : e.value))}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>
      {recordError && <p className="trade-form__error">{recordError}</p>}
      <button type="submit" className="btn accent block" disabled={recording}>
        {recording ? '기록 중...' : '기록하기'}
      </button>
    </form>
  )

  if (variant === 'modal') {
    return (
      <div className="trade-form-overlay" onClick={onClose}>
        <div className="trade-form-overlay__inner" onClick={(e) => e.stopPropagation()}>
          {formEl}
        </div>
      </div>
    )
  }

  return formEl
}
