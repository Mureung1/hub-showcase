import { useState } from 'react'
import AppButton from './AppButton.jsx'
import PhotoUpload from './PhotoUpload.jsx'
import Spinner from './Spinner.jsx'
import { spacing, styles } from '../styles/theme.js'

// 영양성분표(포장지 뒷면 등) 사진을 스캔해 표기된 수치를 그대로 추출하는 입력 폼. AI 호출·파싱은
// 모르고 사진 유무 검증과 로딩/에러 상태만 스스로 관리한 뒤 onScan(photo)를 await한다
// (실제 스캔 로직은 PhotoUpload와 마찬가지로 부모인 Analyze.jsx가 담당).
export default function LabelScan({ onScan }) {
  const [photo, setPhoto] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!photo) {
      setError('영양성분표 사진을 먼저 올려주세요.')
      return
    }

    setError('')
    setLoading(true)
    try {
      await onScan(photo)
    } catch (err) {
      // 429(레이트리밋)는 onScan 내부에서 이미 1~2회 자동 재시도한 뒤에도 실패한 경우라,
      // 여기서는 그 메시지를 그대로 보여주고 버튼을 "다시 스캔"으로 바꿔 수동 재시도만 남겨둔다.
      setError(err.message || '스캔에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PhotoUpload
        onChange={setPhoto}
        placeholderText="영양성분표를 촬영하거나 선택하세요"
        hintText="포장지 뒷면의 표가 잘 보이게 담아주세요"
      />
      <AppButton onClick={handleSubmit} disabled={loading} style={{ marginTop: spacing.lg }}>
        {loading && <Spinner size={16} />}
        {loading ? '스캔 중...' : error ? '다시 스캔' : '스캔하기'}
      </AppButton>
      {error && <p style={styles.errorText}>{error}</p>}
    </div>
  )
}
