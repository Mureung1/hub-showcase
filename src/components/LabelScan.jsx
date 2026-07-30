import { useState } from 'react'
import AppButton from './AppButton.jsx'
import BarcodeScanButton from './BarcodeScanButton.jsx'
import PhotoUpload from './PhotoUpload.jsx'
import Spinner from './Spinner.jsx'
import { getCachedProduct } from '../lib/barcodeCache.js'
import { colors, font, spacing, styles } from '../styles/theme.js'

// 영양성분표(포장지 뒷면 등) 사진을 스캔해 표기된 수치를 그대로 추출하는 입력 폼. AI 호출·파싱은
// 모르고 사진 유무 검증과 로딩/에러 상태만 스스로 관리한 뒤 onScan(photo, ean)를 await한다
// (실제 스캔 로직은 PhotoUpload와 마찬가지로 부모인 Analyze.jsx가 담당).
//
// FR-7 — onBarcodeHit이 있을 때만 바코드 스캔 버튼을 보여준다(BarcodeDetector 미지원 기기에서는
// BarcodeScanButton 자체가 아무것도 렌더링하지 않는다). 바코드를 찾았는데 자체 캐시에 없으면(아직
// OCR로 안 읽어본 제품) 에러가 아니라 안내만 하고 그대로 사진 스캔으로 이어지며, 그 결과가 나오면
// onScan이 이 ean과 함께 호출돼 부모가 다음번을 위해 캐시에 저장할 수 있게 한다.
export default function LabelScan({ onScan, onBarcodeHit }) {
  const [photo, setPhoto] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pendingEan, setPendingEan] = useState(null)
  const [barcodeNotice, setBarcodeNotice] = useState('')

  function handleBarcodeDetected(ean) {
    const cached = getCachedProduct(ean)
    if (cached) {
      onBarcodeHit(cached)
      return
    }
    setPendingEan(ean)
    setBarcodeNotice('이 제품은 아직 몰라요. 영양성분표를 스캔해주세요.')
  }

  async function handleSubmit() {
    if (!photo) {
      setError('영양성분표 사진을 먼저 올려주세요.')
      return
    }

    setError('')
    setLoading(true)
    try {
      await onScan(photo, pendingEan)
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
      {onBarcodeHit && <BarcodeScanButton onDetected={handleBarcodeDetected} />}
      {barcodeNotice && <p style={{ margin: `0 0 ${spacing.md}px`, color: colors.textSub, fontSize: font.size.sm }}>{barcodeNotice}</p>}
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
