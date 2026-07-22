import { useRef, useState } from 'react'
import AppButton from './AppButton.jsx'
import Card from './Card.jsx'
import ImportConflictDialog from './ImportConflictDialog.jsx'
import Spinner from './Spinner.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { useUser } from '../context/UserContext.jsx'
import { applyBackup, exportBackupCSV, parseBackupCSV } from '../lib/dataBackup.js'
import { getPlatform, PLATFORM } from '../utils/platform.js'
import { colors, font, radius, spacing } from '../styles/theme.js'

// MY 탭의 데이터 내보내기/가져오기(PRD v2.0 §2). 3주차부터 게스트와 로그인 계정 모두에서 동작한다 —
// dataBackup.js가 dataStore를 통해 현재 모드(localStorage/Supabase)를 알아서 판단하므로, 이 화면은
// 로그인 여부로 분기하지 않고 안내 문구만 다르게 보여준다.
//
// 흐름: 파일 선택 -> parseBackupCSV(쓰기 없음) -> 중복 날짜가 있으면 다이얼로그 -> applyBackup.
// 성공/실패는 항상 토스트로 알린다(PRD FR-2.1: silent fail 금지).

const PLATFORM_HINT = {
  [PLATFORM.WEB]: 'PC 브라우저의 다운로드 폴더에 저장돼요.',
  [PLATFORM.MOBILE_WEB]: '기기의 다운로드 폴더에 저장돼요.',
  [PLATFORM.APK]: '기기의 Documents 폴더에 저장하고, 공유 시트로 다른 앱에 보낼 수 있어요.',
}

export default function DataBackupPanel() {
  const { authMode, refetchProfile, refetchTodayMeals } = useUser()
  const { showToast } = useToast()
  const fileInputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  // 형식 오류 시 "올바른 형식 예시"를 접어서 보여주기 위한 상태(토스트만으로는 예시를 담기 어렵다).
  const [formatHelp, setFormatHelp] = useState('')
  // 중복 날짜가 있어 사용자 선택을 기다리는 파싱 결과. null이면 다이얼로그를 띄우지 않는다.
  const [pendingImport, setPendingImport] = useState(null)

  const platform = getPlatform()

  async function handleExport() {
    if (busy) return
    setBusy(true)
    setFormatHelp('')
    try {
      const result = await exportBackupCSV()
      if (!result) {
        showToast('내보낼 데이터가 없어요. 신체정보를 입력하거나 식단을 기록한 뒤 다시 시도해주세요.', {
          tone: 'error',
        })
        return
      }

      const parts = []
      if (result.hasProfile) parts.push('신체정보')
      if (result.mealDayCount > 0) parts.push(`식단 ${result.mealDayCount}일치`)

      showToast(`${parts.join(', ')} · ${result.save.message}`, {
        tone: 'success',
        // 네이티브에서만 공유 시트를 띄울 수 있다(PRD FR-2.1: APK는 완료 토스트 + 공유 시트 옵션).
        action: result.save.share ? { label: '공유하기', onClick: () => result.save.share() } : null,
      })
    } catch (err) {
      console.error('backup export failed:', err)
      showToast(err.message || '내보내기에 실패했습니다.', { tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  function handleImportClick() {
    setFormatHelp('')
    fileInputRef.current?.click()
  }

  // 파싱까지만 하고, 중복 날짜가 없으면 곧바로 반영한다.
  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // 같은 파일을 다시 골라도 change가 나도록 비운다
    if (!file || busy) return

    setBusy(true)
    setFormatHelp('')
    try {
      const parsed = await parseBackupCSV(file)
      if (parsed.duplicateDates.length > 0) {
        setPendingImport(parsed)
        return // 다이얼로그에서 이어서 처리
      }
      await runApply(parsed, 'overwrite')
    } catch (err) {
      if (err.expectedFormat) setFormatHelp(err.expectedFormat)
      showToast(err.message || '가져오기에 실패했습니다.', { tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  async function runApply(parsed, duplicateStrategy) {
    const result = await applyBackup(parsed, { duplicateStrategy })
    // 가져오기는 저장소를 직접 덮어쓰므로, 이미 화면에 로드된 UserContext의 프로필/오늘 식단 state도
    // 다시 불러와야 새로고침 없이 바로 반영된다.
    await Promise.all([refetchProfile(), refetchTodayMeals()])

    const parts = [`${result.importedRows}건 가져옴`]
    if (result.failedRows > 0) parts.push(`${result.failedRows}건 실패`)
    if (result.skippedDateCount > 0) parts.push(`${result.skippedDateCount}일 건너뜀`)
    if (result.profileRestored) parts.push('신체정보 복원')
    else if (result.profileSkipped) parts.push('신체정보는 기존 값 유지')

    showToast(parts.join(', '), { tone: result.failedRows > 0 ? 'info' : 'success' })
  }

  async function handleResolveConflict(duplicateStrategy) {
    if (!pendingImport) return
    setBusy(true)
    try {
      await runApply(pendingImport, duplicateStrategy)
      setPendingImport(null)
    } catch (err) {
      showToast(err.message || '가져오기에 실패했습니다.', { tone: 'error' })
      setPendingImport(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Card style={{ marginTop: spacing.md }}>
        <h3 style={{ fontSize: font.size.md, fontWeight: 600, margin: `0 0 ${spacing.xs}px`, color: colors.textStrong }}>
          데이터 내보내기 / 가져오기 (CSV)
        </h3>
        <p style={{ margin: `0 0 ${spacing.md}px`, color: colors.textSub, fontSize: font.size.sm, lineHeight: 1.5 }}>
          신체정보와 식단 기록을 CSV 파일로 저장했다가, 다른 기기에서 가져오기로 그대로 옮길 수 있어요.
          {authMode === 'user'
            ? ' 로그인 계정은 서버에도 자동 저장되지만, 엑셀로 열어보거나 백업본을 따로 보관할 때 유용해요.'
            : ''}
          <br />
          <span style={{ color: colors.muted, fontSize: font.size.xs }}>{PLATFORM_HINT[platform]}</span>
        </p>

        <div style={{ display: 'flex', gap: spacing.sm }}>
          <AppButton variant="secondary" onClick={handleExport} disabled={busy} style={{ flex: 1 }}>
            데이터 내보내기(CSV)
          </AppButton>
          <AppButton variant="secondary" onClick={handleImportClick} disabled={busy} style={{ flex: 1 }}>
            {busy && <Spinner size={16} />}
            {busy ? '처리 중...' : '데이터 가져오기(CSV)'}
          </AppButton>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv,text/comma-separated-values,application/csv"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        {/* PRD FR-2.2: 형식이 안 맞으면 "올바른 형식 예시"를 함께 안내한다. */}
        {formatHelp && (
          <div
            style={{
              marginTop: spacing.md,
              background: colors.bg,
              borderRadius: radius.sm,
              padding: spacing.md,
            }}
          >
            <p style={{ margin: `0 0 ${spacing.sm}px`, fontSize: font.size.xs, fontWeight: 700, color: colors.textStrong }}>
              올바른 형식 예시
            </p>
            <pre
              style={{
                margin: 0,
                fontSize: 11,
                lineHeight: 1.6,
                color: colors.textSub,
                whiteSpace: 'pre',
                overflowX: 'auto',
              }}
            >
              {formatHelp}
            </pre>
          </div>
        )}
      </Card>

      {pendingImport && (
        <ImportConflictDialog
          duplicateDates={pendingImport.duplicateDates}
          totalDates={pendingImport.dates.length}
          busy={busy}
          onOverwrite={() => handleResolveConflict('overwrite')}
          onSkip={() => handleResolveConflict('skip')}
          onCancel={() => setPendingImport(null)}
        />
      )}
    </>
  )
}
