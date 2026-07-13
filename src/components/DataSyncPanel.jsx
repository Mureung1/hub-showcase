import { useRef, useState } from 'react'
import AppButton from './AppButton.jsx'
import Card from './Card.jsx'
import Spinner from './Spinner.jsx'
import { useUser } from '../context/UserContext.jsx'
import { exportCSV, importCSV } from '../lib/csv.js'
import { colors, font, spacing, styles } from '../styles/theme.js'

// 기기 이관용 CSV 내보내기/가져오기 패널. exportCSV/importCSV(lib/csv.js) 호출과 로딩/완료 메시지
// 상태만 관리하고, CSV 파싱이나 DailyRecord 복원 로직은 전혀 모른다.
export default function DataSyncPanel() {
  const { user } = useUser()
  const fileInputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function handleExport() {
    setError('')
    setMessage('')
    const dayCount = exportCSV(user.id)
    if (dayCount === 0) {
      setError('내보낼 기록이 없어요.')
      return
    }
    setMessage(`${dayCount}일치 기록을 내보냈습니다.`)
  }

  function handleImportClick() {
    setError('')
    setMessage('')
    fileInputRef.current?.click()
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setBusy(true)
    setError('')
    setMessage('')
    try {
      const dayCount = await importCSV(user.id, file)
      if (dayCount === 0) {
        setError('가져올 기록이 없어요. 내보내기한 CSV 파일인지 확인해주세요.')
        return
      }
      setMessage(`${dayCount}일치 기록을 복원했습니다.`)
    } catch (err) {
      setError(err.message || '가져오기에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card style={{ marginTop: spacing.md }}>
      <h3 style={{ fontSize: font.size.md, fontWeight: 600, margin: `0 0 ${spacing.xs}px`, color: colors.textStrong }}>
        기록 백업 / 이관
      </h3>
      <p style={{ margin: `0 0 ${spacing.md}px`, color: colors.textSub, fontSize: font.size.sm }}>
        전체 식단 기록을 CSV 파일로 내보내거나, 다른 기기에서 내보낸 CSV를 가져와 복원할 수 있어요. 같은
        날짜 기록이 이미 있으면 가져오는 내용으로 덮어써요.
      </p>
      <div style={{ display: 'flex', gap: spacing.sm }}>
        <AppButton variant="secondary" onClick={handleExport} disabled={busy} style={{ flex: 1 }}>
          CSV 내보내기
        </AppButton>
        <AppButton variant="secondary" onClick={handleImportClick} disabled={busy} style={{ flex: 1 }}>
          {busy && <Spinner size={16} />}
          {busy ? '가져오는 중...' : 'CSV 가져오기'}
        </AppButton>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      {message && (
        <p style={{ color: colors.success, fontSize: font.size.sm, margin: `${spacing.sm}px 0 0` }}>{message}</p>
      )}
      {error && <p style={styles.errorText}>{error}</p>}
    </Card>
  )
}
