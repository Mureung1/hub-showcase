import { useEffect, useState } from 'react'
import AppButton from './AppButton.jsx'
import { NutrientBars } from './NutritionCard.jsx'
import SegmentedControl from './SegmentedControl.jsx'
import TextField from './TextField.jsx'
import { COMBO_INGREDIENTS } from '../data/comboIngredients.js'
import { buildComboAnalysis } from '../lib/comboBuilder.js'
import { claimQuest } from '../lib/dataStore.js'
import { logicalDateKey } from '../lib/logicalDate.js'
import { COMBO_BUILDER_TRY_ID, FEATURE_TRY_XP } from '../lib/quests.js'
import { colors, font, radius, spacing } from '../styles/theme.js'

// 리텐션 강화 v4 — 손수 큐레이션한 재료 데이터(comboIngredients.js)로 실제 맥도날드/서브웨이식
// 모듈형 커스텀(베이스 하나 + 토핑 여러 개 + 국물·음료)을 흉내낸다. "국물·음료" 그룹만 soup+drink
// 두 원천을 합쳐서 보여준다(DB 조회 시절과 달리 이제 카테고리가 아니라 이 파일이 직접 그룹을 나눈다).
const GROUPS = [
  { key: 'base', label: '베이스' },
  { key: 'topping', label: '토핑' },
  { key: 'extra', label: '국물·음료' },
]

function ingredientsFor(groupKey) {
  if (groupKey === 'extra') return [...COMBO_INGREDIENTS.soup, ...COMBO_INGREDIENTS.drink]
  return COMBO_INGREDIENTS[groupKey] ?? []
}

// 홈 화면 "커스텀 조합" 탭(FR-19) — 베이스/토핑/국물·음료를 이름 매칭 없이 큐레이션된 재료 목록에서
// 직접 골라 담는다(Gemini 호출도, 서버 왕복도 없어 응답이 즉시다). 담을 때마다
// buildComboAnalysis(comboBuilder.js)로 실시간 합산 미리보기를 보여주고, "완료"를 누르면 그
// 결과({items,total})를 그대로 onComplete에 넘긴다 — 이후 흐름(AnalysisResultCard/저장)은 기존
// 사진/텍스트 분석 결과와 동일하게 처리된다.
export default function CustomComboBuilder({ onComplete }) {
  const [activeGroup, setActiveGroup] = useState(GROUPS[0].key)
  const [query, setQuery] = useState('')
  const [items, setItems] = useState(ingredientsFor(GROUPS[0].key))
  const [selected, setSelected] = useState([]) // [{name, nutrients, baseQuantity, servingGrams, qty}]

  // 재료가 전부 로컬 데이터라 fetch/로딩 상태가 필요 없다 — 그룹/검색어가 바뀌면 즉시 다시 필터링한다.
  useEffect(() => {
    const pool = ingredientsFor(activeGroup)
    const q = query.trim()
    setItems(q ? pool.filter((item) => item.name.includes(q)) : pool)
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
          servingGrams: item.servingGrams,
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
        베이스·토핑·국물·음료를 직접 골라 담으면 실시간으로 영양을 합산해드려요.
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
        placeholder="예: 치즈"
      />

      <div style={{ maxHeight: 220, overflowY: 'auto', border: `1px solid ${colors.border}`, borderRadius: radius.md, marginTop: spacing.sm }}>
        {items.length === 0 ? (
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

      <AppButton
        onClick={() => {
          // week-try-combo(FR-16 다양화) 유도용 마커 클레임 — 하루 1회만 의미 있으면 되고(quest_claims
          // 유니크 제약이 중복을 막아줌), 실패해도 조합 완료 자체는 막지 않는 장식적 부가 동작이다.
          claimQuest({ dateKey: logicalDateKey(new Date()), questId: COMBO_BUILDER_TRY_ID, xpAwarded: FEATURE_TRY_XP }).catch(() => {})
          onComplete(analysis)
        }}
        disabled={selected.length === 0}
        style={{ marginTop: spacing.lg }}
      >
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
