import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PhotoUpload from '../components/PhotoUpload.jsx'
import NutritionCard from '../components/NutritionCard.jsx'
import Spinner from '../components/Spinner.jsx'
import { useUser } from '../context/UserContext.jsx'
import { geminiComplete, parseJsonLoose } from '../lib/gemini.js'
import { isMealAnalysis } from '../lib/nutrition.js'
import { spacing, styles } from '../styles/theme.js'

function buildPrompt(menuName, brand) {
  const hints = []
  if (menuName) hints.push(`메뉴명 힌트: ${menuName}`)
  if (brand) hints.push(`브랜드 힌트: ${brand}`)
  const hintText = hints.length ? `\n${hints.join('\n')}` : ''

  return `이 음식 사진을 분석해줘. 프랜차이즈로 식별되면 공식 영양표 기준, 아니면 표준 조리법 기반으로 추정해줘.${hintText}

설명이나 마크다운 없이, 아래 스키마와 정확히 일치하는 MealAnalysis JSON만 반환해:
{
  "items": [
    { "name": "메뉴명", "brand": "브랜드명(없으면 생략)", "nutrients": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0, "sodium": 0 } }
  ],
  "total": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0, "sodium": 0 }
}`
}

export default function Analyze() {
  const { setTodayMeal, todayMeal } = useUser()
  const navigate = useNavigate()
  const [photo, setPhoto] = useState(null) // { base64, mimeType, dataUrl, width, height }
  const [menuName, setMenuName] = useState('')
  const [brand, setBrand] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAnalyze() {
    setError('')

    if (!photo) {
      setError('사진을 먼저 업로드해주세요.')
      return
    }

    setLoading(true)
    try {
      const prompt = buildPrompt(menuName, brand)
      const text = await geminiComplete({ prompt, imageBase64: photo.base64, mimeType: photo.mimeType })
      const parsed = parseJsonLoose(text)

      if (!isMealAnalysis(parsed)) {
        throw new Error('분석 결과 형식이 올바르지 않습니다.')
      }

      setTodayMeal(parsed)
      navigate('/result')
    } catch (err) {
      console.error('meal analysis failed:', err)
      setError('분석에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <h1>사진 분석</h1>

      <div style={styles.card}>
        <PhotoUpload onChange={setPhoto} />

        <div style={{ ...styles.field, marginTop: spacing.lg }}>
          <label htmlFor="menuName" style={styles.label}>
            메뉴명 (선택)
          </label>
          <input id="menuName" value={menuName} onChange={(e) => setMenuName(e.target.value)} style={styles.input} />
        </div>

        <div style={styles.field}>
          <label htmlFor="brand" style={styles.label}>
            브랜드 (선택)
          </label>
          <input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} style={styles.input} />
        </div>

        <button
          type="button"
          onClick={handleAnalyze}
          disabled={loading}
          style={{ ...styles.buttonPrimary, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading && <Spinner size={16} />}
          {loading ? '분석 중...' : error ? '다시 시도' : '분석하기'}
        </button>

        {loading && (
          <p style={{ ...styles.helperText, marginTop: spacing.sm }}>사진을 분석하고 있어요. 수 초 정도 걸릴 수 있어요.</p>
        )}
        {error && <p style={styles.errorText}>{error}</p>}
      </div>

      <NutritionCard analysis={todayMeal} />
    </div>
  )
}
