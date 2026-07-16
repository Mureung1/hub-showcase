import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { SETUP_TAGS, EMOTIONS } from '../lib/tradeMeta.js'
import './TradeForm.css'

const SIDE_LABEL = { buy: '매수', sell: '매도', hold: '관망' }
const SIDES = ['buy', 'sell', 'hold']

/**
 * 매매 기록 폼: 3-way 매수/매도/관망 + 가격/수량/메모 → trades insert.
 * StockPage 우측 사이드 패널에서 인라인으로 쓴다. Supabase insert는 ConditionForm과
 * 동일한 관례(폼이 스스로 저장하고 결과를 콜백으로 전달)를 따라 이 컴포넌트가 담당한다.
 *
 * @param {object} symbolMeta 기록 대상 종목 {ticker, market, exchange?, name?}
 * @param {number|string|null} [defaultPrice] 현재가 프리필 값 — 가격 입력이 비어있을 때만 채운다
 *   (사용자가 이미 값을 입력/수정했다면 이후 defaultPrice가 바뀌어도 덮어쓰지 않는다).
 * @param {(trade: object) => void} [onSaved] 저장 성공 후 호출(insert된 trades row 전달).
 *   호출부가 목록 갱신(예: loadRecords 재호출) 등 후처리를 여기서 수행한다.
 * @param {'inline'|'modal'} [variant] 스타일 변형 자리(WP-C 차트 클릭 모달 대비).
 *   현재는 inline 레이아웃만 구현되어 있고 modal은 루트에 보조 클래스만 붙는다.
 */
export default function TradeForm({ symbolMeta, defaultPrice, onSaved, variant = 'inline' }) {
  const [side, setSide] = useState('buy')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [memo, setMemo] = useState('')
  const [tags, setTags] = useState([])
  const [emotion, setEmotion] = useState(null)
  const [recording, setRecording] = useState(false)
  const [recordError, setRecordError] = useState('')

  function toggleTag(tag) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  // 현재가 프리필: 사용자가 아직 가격을 입력하지 않았을 때만 채운다
  useEffect(() => {
    if (defaultPrice != null) setPrice((prev) => (prev === '' ? String(defaultPrice) : prev))
  }, [defaultPrice])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!supabase || !symbolMeta) return
    setRecordError('')
    if (!price) {
      setRecordError('가격을 입력하세요.')
      return
    }
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id
    if (!userId) {
      setRecordError('로그인이 필요합니다.')
      return
    }

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
        traded_at: new Date().toISOString(),
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

  return (
    <form
      className={variant === 'modal' ? 'card trade-form trade-form--modal' : 'card trade-form'}
      onSubmit={handleSubmit}
    >
      <div className="trade-form__title">매매 기록</div>
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
}
