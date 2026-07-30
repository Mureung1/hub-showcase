import { useState } from 'react'
import AppButton from './AppButton.jsx'
import Card from './Card.jsx'
import ChevronIcon from './ChevronIcon.jsx'
import TextField from './TextField.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { useUser } from '../context/UserContext.jsx'
import { exportCSV } from '../lib/csv.js'
import { toDateKey } from '../lib/records.js'
import { colors, font, spacing, styles } from '../styles/theme.js'

// 달력 탭 전용 기간별 CSV 내보내기. 시작~종료일을 지정해 그 기간의 날짜별 영양정보+그날 먹은 음식만
// 내보낸다(lib/csv.js의 exportCSV를 range와 함께 호출) — MY 탭의 전체 내보내기와는 별개 진입점이다.
//
// 달력 페이지 맨 아래에 항상 펼쳐진 채로 있어서 자리를 많이 차지했다 — 기본 접힘 아코디언으로 바꿨다.
// 이 프로젝트에 공용 Accordion 컴포넌트는 없고 "카드 자체가 아코디언" 관용구가 여러 곳에 있어
// (CnuCafeteriaLocationCard, Profile의 건강정보 등) 그 형태를 그대로 따른다: Card의 기본 padding을
// 0으로 죽여 헤더 버튼을 카드 폭 전체로 깔고, 본문에만 패딩을 다시 준다.
// 펼침 애니메이션은 height가 아니라 .tds-card-swap(opacity+translate) — 이 앱은 리플로우를 유발하는
// 속성을 애니메이션하지 않는다.
export default function DateRangeExport() {
  const { effectiveUserId } = useUser()
  const { showToast } = useToast()
  const todayKey = toDateKey(new Date())
  const [open, setOpen] = useState(false)
  const [startDate, setStartDate] = useState(todayKey)
  const [endDate, setEndDate] = useState(todayKey)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleExport() {
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

    setBusy(true)
    try {
      const result = await exportCSV(effectiveUserId, { startDate, endDate })
      if (!result) {
        setError('선택한 기간에는 기록이 없어요.')
        return
      }
      setMessage(`${result.dayCount}일치 기록을 내보냈습니다.`)
      showToast(`${result.dayCount}일치 기록 · ${result.save.message}`, {
        tone: 'success',
        action: result.save.share ? { label: '공유하기', onClick: () => result.save.share() } : null,
      })
    } catch (err) {
      console.error('date range export failed:', err)
      const msg = err.message || '내보내기에 실패했습니다.'
      setError(msg)
      showToast(msg, { tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <button
        type="button"
        className="tds-press"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
          background: 'none',
          border: 'none',
          padding: spacing.xl,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div>
          <h3 style={{ fontSize: font.size.md, fontWeight: 600, margin: 0, color: colors.textStrong }}>
            기간별 기록 내보내기
          </h3>
          <p style={{ margin: `${spacing.xs}px 0 0`, color: colors.textSub, fontSize: font.size.xs }}>
            원하는 기간을 골라 CSV로 저장해요
          </p>
        </div>
        <span style={{ color: colors.muted, flexShrink: 0 }}>
          <ChevronIcon open={open} />
        </span>
      </button>

      {open && (
        <div className="tds-card-swap" style={{ padding: `0 ${spacing.xl}px ${spacing.xl}px` }}>
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
          <AppButton variant="secondary" onClick={handleExport} disabled={busy}>
            {busy ? '내보내는 중...' : 'CSV로 내보내기'}
          </AppButton>
          {message && (
            <p style={{ color: colors.success, fontSize: font.size.sm, margin: `${spacing.sm}px 0 0` }}>{message}</p>
          )}
          {error && <p style={styles.errorText}>{error}</p>}
        </div>
      )}
    </Card>
  )
}
