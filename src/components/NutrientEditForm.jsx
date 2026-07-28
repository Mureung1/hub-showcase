import { useState } from 'react'
import AppButton from './AppButton.jsx'
import { NUTRIENT_LABELS } from '../lib/nutrition.js'
import { colors, font, radius, spacing } from '../styles/theme.js'

// 영양소 6개를 직접 고치는 공용 폼 — 저장 전 결과 카드(AnalysisResultCard, 트랙 2 §4)와 저장된 기록
// 수정(MealsPage, 트랙 2 §5)이 함께 쓴다. 두 자리 모두 "지금 화면에 보이는 값"을 그대로 편집하게 하고,
// 그 값을 실제 상태(1인분 기준 baseNutrients냐, 저장된 최종 nutrients냐)로 어떻게 반영할지는 호출부의
// onSave가 결정한다 — 이 폼 자체는 "숫자 6개를 고쳐서 돌려준다"는 것만 책임진다.
// saving: 저장된 기록 수정(MealsPage, 트랙 2 §5)처럼 onSave가 네트워크/스토리지 요청으로 이어지는
// 호출부에서만 쓴다 — 저장 전 결과 카드(AnalysisResultCard)는 로컬 상태만 바꾸는 동기 동작이라
// 기본값(false) 그대로 둔다.
export default function NutrientEditForm({ nutrients, onCancel, onSave, saving = false }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(NUTRIENT_LABELS.map(({ key }) => [key, String(nutrients[key] ?? 0)])),
  )

  function handleSave() {
    const next = {}
    for (const { key } of NUTRIENT_LABELS) {
      const raw = values[key]
      const num = Number(raw)
      // 빈 칸/잘못된 값은 원래 값으로 되돌린다 — 실수로 0을 저장하는 것보다 안전하다.
      // Number('')는 NaN이 아니라 0이라, raw가 빈 문자열인지부터 먼저 확인해야 한다.
      next[key] = raw !== '' && Number.isFinite(num) && num >= 0 ? num : nutrients[key]
    }
    onSave(next)
  }

  return (
    <div>
      {NUTRIENT_LABELS.map(({ key, label, unit }) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <label htmlFor={`edit-nutrient-${key}`} style={{ fontSize: font.size.sm, color: colors.textStrong }}>
            {label}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              id={`edit-nutrient-${key}`}
              type="number"
              min="0"
              inputMode="decimal"
              value={values[key]}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              style={{
                width: 72,
                padding: '6px 8px',
                borderRadius: radius.sm,
                border: `1px solid ${colors.border}`,
                fontSize: font.size.sm,
                textAlign: 'right',
              }}
            />
            <span style={{ fontSize: font.size.xs, color: colors.textSub }}>{unit}</span>
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.md }}>
        <AppButton variant="secondary" onClick={onCancel} disabled={saving} style={{ flex: 1 }}>
          취소
        </AppButton>
        <AppButton onClick={handleSave} disabled={saving} style={{ flex: 1 }}>
          {saving ? '저장 중...' : '적용'}
        </AppButton>
      </div>
    </div>
  )
}
