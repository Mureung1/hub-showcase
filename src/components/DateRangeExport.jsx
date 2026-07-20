import { useState } from 'react'
import AppButton from './AppButton.jsx'
import Card from './Card.jsx'
import TextField from './TextField.jsx'
import { useUser } from '../context/UserContext.jsx'
import { exportCSV } from '../lib/csv.js'
import { toDateKey } from '../lib/records.js'
import { colors, font, spacing, styles } from '../styles/theme.js'

// 달력 탭 전용 기간별 CSV 내보내기. 시작~종료일을 지정해 그 기간의 날짜별 영양정보+그날 먹은 음식만
// 내보낸다(lib/csv.js의 exportCSV를 range와 함께 호출) — MY 탭의 전체 내보내기와는 별개 진입점이다.
export default function DateRangeExport() {
  const { effectiveUserId } = useUser()
  const todayKey = toDateKey(new Date())
  const [startDate, setStartDate] = useState(todayKey)
  const [endDate, setEndDate] = useState(todayKey)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function handleExport() {
    setMessage('')
    setError('')

    if (!startDate || !endDate) {
      setError('시작일과 종료일을 모두 선택해주세요.')
      return
    }
    if (startDate > endDate) {
      setError('시작일은 종료일보다 늦을 수 없어요.')
      return
    }

    try {
      const dayCount = exportCSV(effectiveUserId, { startDate, endDate })
      if (dayCount === 0) {
        setError('선택한 기간에는 기록이 없어요.')
        return
      }
      setMessage(`${dayCount}일치 기록을 내보냈습니다.`)
    } catch (err) {
      console.error('date range export failed:', err)
      setError(err.message || '내보내기에 실패했습니다.')
    }
  }

  return (
    <Card>
      <h3 style={{ fontSize: font.size.md, fontWeight: 600, margin: `0 0 ${spacing.xs}px`, color: colors.textStrong }}>
        기간별 기록 내보내기
      </h3>
      <p style={{ margin: `0 0 ${spacing.md}px`, color: colors.textSub, fontSize: font.size.sm }}>
        선택한 기간의 날짜별 영양정보와 그날 먹은 음식을 CSV로 내보내 다른 기기로 옮길 수 있어요.
      </p>
      <div style={{ display: 'flex', gap: spacing.sm }}>
        <div style={{ flex: 1 }}>
          <TextField
            label="시작일"
            id="rangeStart"
            type="date"
            value={startDate}
            max={todayKey}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div style={{ flex: 1 }}>
          <TextField
            label="종료일"
            id="rangeEnd"
            type="date"
            value={endDate}
            max={todayKey}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>
      <AppButton variant="secondary" onClick={handleExport}>
        CSV로 내보내기
      </AppButton>
      {message && (
        <p style={{ color: colors.success, fontSize: font.size.sm, margin: `${spacing.sm}px 0 0` }}>{message}</p>
      )}
      {error && <p style={styles.errorText}>{error}</p>}
    </Card>
  )
}
