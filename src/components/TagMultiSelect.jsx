import { useState } from 'react'
import { colors, font, radius, spacing, styles } from '../styles/theme.js'

// 고정 옵션(칩 토글) + "기타" 자유 입력 태그를 함께 다루는 다중 선택 UI. value는 옵션 key와 사용자가
// 직접 추가한 문자열이 섞인 하나의 배열(string[])이다 — 알레르기/기저질환처럼 "흔한 항목은 선택, 나머지는
// 직접 입력"이 필요한 곳에서 재사용한다.
export default function TagMultiSelect({ label, options, value, onChange, placeholder = '직접 입력 후 추가' }) {
  const [customText, setCustomText] = useState('')
  const optionKeys = options.map((o) => o.key)
  const customTags = value.filter((v) => !optionKeys.includes(v))

  function toggleOption(key) {
    onChange(value.includes(key) ? value.filter((v) => v !== key) : [...value, key])
  }

  function addCustom() {
    const text = customText.trim()
    if (!text || value.includes(text)) return
    onChange([...value, text])
    setCustomText('')
  }

  function removeCustom(text) {
    onChange(value.filter((v) => v !== text))
  }

  const chipStyle = (active) => ({
    padding: `${spacing.sm}px ${spacing.lg}px`,
    borderRadius: radius.pill,
    border: 'none',
    background: active ? colors.primary : colors.bg,
    color: active ? '#fff' : colors.textSub,
    fontWeight: 600,
    fontSize: font.size.sm,
    cursor: 'pointer',
  })

  return (
    <div style={{ ...styles.field, marginBottom: 0 }}>
      <span style={styles.label}>{label}</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm }}>
        {options.map((opt) => (
          <button
            key={opt.key}
            type="button"
            className="tds-press"
            onClick={() => toggleOption(opt.key)}
            style={chipStyle(value.includes(opt.key))}
          >
            {opt.label}
          </button>
        ))}
        {customTags.map((tag) => (
          <button
            key={tag}
            type="button"
            className="tds-press"
            onClick={() => removeCustom(tag)}
            style={chipStyle(true)}
          >
            {tag} ×
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: spacing.sm }}>
        <input
          type="text"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addCustom()
            }
          }}
          placeholder={placeholder}
          style={{ ...styles.input, flex: 1 }}
        />
        <button type="button" className="tds-press" onClick={addCustom} style={styles.buttonSecondary}>
          추가
        </button>
      </div>
    </div>
  )
}
