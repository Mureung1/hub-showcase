import { useRef, useState } from 'react'
import AppButton from './AppButton.jsx'
import Card from './Card.jsx'
import Spinner from './Spinner.jsx'
import { useUser } from '../context/UserContext.jsx'
import { exportGuestBackupCSV, importGuestBackupCSV } from '../lib/guestBackup.js'
import { colors, font, spacing, styles } from '../styles/theme.js'

// 게스트(비로그인) 전용 기기 이관 패널. 로그인 계정은 데이터가 이미 Supabase에 저장돼 CSV로 옮길
// 필요가 없으므로, 로그인 상태에서는 버튼 대신 그 사실을 안내하는 문구만 보여준다.
export default function GuestBackupPanel() {
  const { authMode, refetchProfile, refetchTodayMeals } = useUser()
  const fileInputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function handleExport() {
    setError('')
    setMessage('')
    const result = exportGuestBackupCSV()
    if (!result) {
      setError('내보낼 데이터가 없어요. 신체정보를 입력하거나 식단을 기록한 뒤 다시 시도해주세요.')
      return
    }
    const parts = []
    if (result.hasProfile) parts.push('신체정보')
    if (result.mealDayCount > 0) parts.push(`식단 ${result.mealDayCount}일치`)
    setMessage(`${parts.join(', ')}를 내보냈습니다.`)
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
      const result = await importGuestBackupCSV(file)
      // 가져오기는 localStorage를 직접 덮어쓰므로, 이미 화면에 로드된 UserContext의 프로필/오늘 식단
      // state도 다시 불러와야 새로고침 없이 바로 반영된다.
      await Promise.all([refetchProfile(), refetchTodayMeals()])
      const parts = []
      if (result.profileRestored) parts.push('신체정보')
      if (result.mealDayCount > 0) parts.push(`식단 ${result.mealDayCount}일치`)
      setMessage(`${parts.join(', ')}를 복원했습니다.`)
    } catch (err) {
      setError(err.message || '가져오기에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  if (authMode === 'user') {
    return (
      <Card style={{ marginTop: spacing.md }}>
        <h3 style={{ fontSize: font.size.md, fontWeight: 600, margin: `0 0 ${spacing.xs}px`, color: colors.textStrong }}>
          기기 이동
        </h3>
        <p style={{ margin: 0, color: colors.textSub, fontSize: font.size.sm }}>
          로그인 계정은 데이터가 서버에 자동 저장돼요. 다른 기기에서 같은 계정으로 로그인하면 그대로
          보이니, 이 CSV 백업 기능은 로그인하지 않은 게스트 모드에서만 써요.
        </p>
      </Card>
    )
  }

  return (
    <Card style={{ marginTop: spacing.md }}>
      <h3 style={{ fontSize: font.size.md, fontWeight: 600, margin: `0 0 ${spacing.xs}px`, color: colors.textStrong }}>
        데이터 내보내기 / 가져오기 (CSV)
      </h3>
      <p style={{ margin: `0 0 ${spacing.md}px`, color: colors.textSub, fontSize: font.size.sm }}>
        로그인 없이도 신체정보와 식단 기록을 CSV 파일로 저장했다가, 다른 기기에서 가져오기로 그대로
        옮길 수 있어요. 로그인 계정에는 영향을 주지 않아요.
      </p>
      <div style={{ display: 'flex', gap: spacing.sm }}>
        <AppButton variant="secondary" onClick={handleExport} disabled={busy} style={{ flex: 1 }}>
          데이터 내보내기(CSV)
        </AppButton>
        <AppButton variant="secondary" onClick={handleImportClick} disabled={busy} style={{ flex: 1 }}>
          {busy && <Spinner size={16} />}
          {busy ? '가져오는 중...' : '데이터 가져오기(CSV)'}
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
