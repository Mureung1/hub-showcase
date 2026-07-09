import { useState } from 'react'
import AppButton from '../components/AppButton.jsx'
import Card from '../components/Card.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import TextField from '../components/TextField.jsx'
import { searchFoodDB } from '../lib/fooddb.js'
import { colors, font, spacing, styles } from '../styles/theme.js'

// 임시 테스트 화면: 식약처 식품DB 검색 프록시가 정확한 값을 반환하는지 확인하기 위한 용도.
// AI 결합 및 정식 화면 설계 단계에서 제거 예정.
export default function FoodDbTest() {
  const [query, setQuery] = useState('떡볶이')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [results, setResults] = useState(null)

  async function handleSearch() {
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    try {
      const items = await searchFoodDB(query)
      console.log('[fooddb-test] searchFoodDB(%s) ->', query, items)
      setResults(items)
    } catch (err) {
      console.error('[fooddb-test] search failed:', err)
      setError(err.message)
      setResults(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <ScreenHeader title="식품DB 검색 테스트 (임시)" subtitle="식약처 공공API 연동 확인용 · 다음 단계에서 제거 예정" />

      <Card>
        <TextField
          label="식품명"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="예: 떡볶이"
        />
        <AppButton onClick={handleSearch} disabled={loading}>
          {loading ? '검색 중...' : '검색'}
        </AppButton>
      </Card>

      {error && (
        <Card style={{ background: colors.dangerSurface, boxShadow: 'none' }}>
          <p style={{ margin: 0, color: colors.danger, fontSize: font.size.sm }}>{error}</p>
        </Card>
      )}

      {results && results.length === 0 && (
        <Card style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, color: colors.textSub }}>검색 결과가 없어요.</p>
        </Card>
      )}

      {results?.map((item, i) => (
        <Card key={i}>
          <h3 style={{ margin: `0 0 ${spacing.xs}px`, fontSize: font.size.md, color: colors.textStrong }}>{item.name}</h3>
          <p style={{ margin: `0 0 ${spacing.sm}px`, fontSize: font.size.xs, color: colors.textSub }}>
            기준량 {item.baseQuantity?.raw ?? '알 수 없음'}
          </p>
          <p style={{ margin: 0, fontSize: font.size.sm, color: colors.textStrong }}>
            {item.nutrients.calories ?? '-'}kcal · 단백질 {item.nutrients.protein ?? '-'}g · 탄수 {item.nutrients.carbs ?? '-'}g · 지방{' '}
            {item.nutrients.fat ?? '-'}g · 식이섬유 {item.nutrients.fiber ?? '-'}g · 나트륨 {item.nutrients.sodium ?? '-'}mg
          </p>
        </Card>
      ))}
    </div>
  )
}
