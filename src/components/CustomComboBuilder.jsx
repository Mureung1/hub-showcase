import { useEffect, useState } from 'react'
import AppButton from './AppButton.jsx'
import { NutrientBars } from './NutritionCard.jsx'
import SegmentedControl from './SegmentedControl.jsx'
import Spinner from './Spinner.jsx'
import TextField from './TextField.jsx'
import { buildComboAnalysis, DEFAULT_SERVING_GRAMS } from '../lib/comboBuilder.js'
import { fetchFoodItems } from '../lib/foodItemsApi.js'
import { colors, font, radius, spacing } from '../styles/theme.js'

// foodDB.json의 실제 category 8종(side/soup/kimchi/main/rice/dessert/drink/noodle)을 베이스/토핑/
// 국물·음료 3그룹으로 묶는다 — "소스" 카테고리는 DB에 없어 이 범위에서 제외했다(FR-19 PRD 참고).
const GROUPS = [
  { key: 'base', label: '베이스', categories: ['rice', 'noodle'] },
  { key: 'topping', label: '토핑', categories: ['main', 'side', 'kimchi', 'dessert'] },
  { key: 'extra', label: '국물·음료', categories: ['soup', 'drink'] },
]

// 홈 화면 "커스텀 조합" 탭(FR-19) — 베이스/토핑/국물·음료를 이름 매칭 없이 DB 항목에서 직접 골라
// 담는다(Gemini 호출이 전혀 없어 응답이 빠르고, 매칭이 필요 없을 만큼 확정적인 선택이라 정확하다).
// 담을 때마다 buildComboAnalysis(comboBuilder.js)로 실시간 합산 미리보기를 보여주고, "완료"를 누르면
// 그 결과({items,total})를 그대로 onComplete에 넘긴다 — 이후 흐름(AnalysisResultCard/저장)은 기존
// 사진/텍스트 분석 결과와 동일하게 처리된다.
export default function CustomComboBuilder({ onComplete }) {
  const [activeGroup, setActiveGroup] = useState(GROUPS[0].key)
  const [query, setQuery] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState([]) // [{name, nutrients, baseQuantity, servingGrams, qty}]

  useEffect(() => {
    const group = GROUPS.find((g) => g.key === activeGroup)
    let cancelled = false
    setLoading(true)
    // 그룹 하나가 여러 DB category로 이루어질 수 있어(예: 토핑=main+side+kimchi+dessert) 병렬 조회 후 합친다.
    Promise.all(group.categories.map((category) => fetchFoodItems({ category, q: query, limit: 20 })))
      .then((lists) => {
        if (!cancelled) setItems(lists.flat())
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeGroup, query])

  function handleAdd(item) {
    setSelected((prev) => {
      const idx = prev.findIndex((s) => s.name === item.name)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 }
        return next
      }
      return [
        ...prev,
        {
          name: item.name,
          nutrients: item.nutrients,
          baseQuantity: item.baseQuantity,
          servingGrams: item.servSize ?? DEFAULT_SERVING_GRAMS,
          qty: 1,
        },
      ]
    })
  }

  function handleQtyChange(name, delta) {
    setSelected((prev) => prev.map((s) => (s.name === name ? { ...s, qty: s.qty + delta } : s)).filter((s) => s.qty > 0))
  }

  const analysis = buildComboAnalysis(selected)

  return (
    <div>
      <h3 style={{ fontSize: font.size.md, fontWeight: 600, margin: `0 0 ${spacing.xs}px`, color: colors.textStrong }}>
        커스텀 조합
      </h3>
      <p style={{ margin: `0 0 ${spacing.md}px`, color: colors.textSub, fontSize: font.size.sm }}>
        베이스·토핑·국물을 직접 골라 담으면 실시간으로 영양을 합산해드려요.
      </p>

      <SegmentedControl
        options={GROUPS}
        value={activeGroup}
        onChange={setActiveGroup}
        style={{ marginBottom: spacing.sm }}
      />
      <TextField
        label="재료 검색(선택)"
        id="combo-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="예: 돈까스"
      />

      <div style={{ maxHeight: 220, overflowY: 'auto', border: `1px solid ${colors.border}`, borderRadius: radius.md, marginTop: spacing.sm }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: spacing.lg }}>
            <Spinner size={20} />
          </div>
        ) : items.length === 0 ? (
          <p style={{ margin: 0, padding: spacing.md, fontSize: font.size.sm, color: colors.textSub }}>
            검색 결과가 없어요.
          </p>
        ) : (
          items.map((item) => (
            <button
              key={item.name}
              type="button"
              className="tds-press"
              onClick={() => handleAdd(item)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                padding: `${spacing.sm}px ${spacing.md}px`,
                border: 'none',
                borderBottom: `1px solid ${colors.border}`,
                background: 'none',
                fontSize: font.size.sm,
                color: colors.textStrong,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span>{item.name}</span>
              <span style={{ color: colors.primary, fontWeight: 700 }}>담기 +</span>
            </button>
          ))
        )}
      </div>

      {selected.length > 0 && (
        <div style={{ marginTop: spacing.lg }}>
          <h4 style={{ margin: `0 0 ${spacing.sm}px`, fontSize: font.size.sm, fontWeight: 700, color: colors.textStrong }}>
            담은 재료
          </h4>
          {selected.map((s) => (
            <div
              key={s.name}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${spacing.xs}px 0` }}
            >
              <span style={{ fontSize: font.size.sm, color: colors.textStrong }}>{s.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                <button
                  type="button"
                  className="tds-press"
                  aria-label={`${s.name} 수량 줄이기`}
                  onClick={() => handleQtyChange(s.name, -1)}
                  style={stepperButtonStyle}
                >
                  −
                </button>
                <span style={{ minWidth: 16, textAlign: 'center', fontSize: font.size.sm }}>{s.qty}</span>
                <button
                  type="button"
                  className="tds-press"
                  aria-label={`${s.name} 수량 늘리기`}
                  onClick={() => handleQtyChange(s.name, 1)}
                  style={stepperButtonStyle}
                >
                  +
                </button>
              </div>
            </div>
          ))}

          <div style={{ marginTop: spacing.md }}>
            <NutrientBars nutrients={analysis.total} />
          </div>
        </div>
      )}

      <AppButton onClick={() => onComplete(analysis)} disabled={selected.length === 0} style={{ marginTop: spacing.lg }}>
        완료
      </AppButton>
    </div>
  )
}

const stepperButtonStyle = {
  width: 24,
  height: 24,
  borderRadius: radius.sm,
  border: 'none',
  background: colors.bg,
  color: colors.textStrong,
  fontWeight: 700,
  cursor: 'pointer',
  lineHeight: '24px',
  padding: 0,
}
