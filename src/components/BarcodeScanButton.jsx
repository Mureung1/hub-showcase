import { useEffect, useRef, useState } from 'react'
import { isBarcodeDetectorSupported, scanBarcodeFromVideo } from '../lib/barcodeScanner.js'
import { useFocusTrap } from '../lib/useFocusTrap.js'
import { colors, font, layout, radius, shadow, spacing, styles } from '../styles/theme.js'

// FR-7 — 미지원 기기(BarcodeDetector 없음)에서는 이 컴포넌트가 아예 아무것도 렌더링하지 않는다 —
// 비활성 버튼이나 에러로 보여주는 대신 원래 없던 기능처럼 다룬다. onDetected(ean)만 호출하고, 그
// 바코드로 뭘 할지(캐시 조회 등)는 호출부(LabelScan.jsx)가 정한다 — 이 컴포넌트는 "카메라를 열고
// 바코드 하나를 찾아 알려주는" 책임만 진다.
export default function BarcodeScanButton({ onDetected }) {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const videoRef = useRef(null)
  const stopScanRef = useRef(null)
  const streamRef = useRef(null)
  const containerRef = useFocusTrap(scanning, scanning ? handleCancel : undefined)

  function cleanup() {
    stopScanRef.current?.()
    stopScanRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  // 언마운트 시(다른 화면으로 이동 등) 카메라가 계속 켜져 있지 않게 반드시 정리한다.
  useEffect(() => cleanup, [])

  function handleCancel() {
    cleanup()
    setScanning(false)
  }

  async function startScan() {
    setError('')
    setScanning(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (!videoRef.current) throw new Error('video element missing')
      videoRef.current.srcObject = stream
      await videoRef.current.play()

      const { promise, stop } = scanBarcodeFromVideo(videoRef.current)
      stopScanRef.current = stop
      const ean = await promise

      cleanup()
      setScanning(false)
      if (ean) onDetected(ean)
    } catch {
      cleanup()
      setScanning(false)
      setError('카메라를 사용할 수 없어요. 영양성분표 사진으로 스캔해주세요.')
    }
  }

  if (!isBarcodeDetectorSupported()) return null

  return (
    <>
      <button type="button" className="tds-press" onClick={startScan} style={{ ...styles.linkButton, marginBottom: spacing.md }}>
        바코드로 스캔
      </button>
      {error && <p style={styles.errorText}>{error}</p>}

      {scanning && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="바코드 스캔"
          ref={containerRef}
          tabIndex={-1}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 90,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: layout.pagePaddingX,
          }}
        >
          {/* eslint-disable-next-line jsx-a11y/media-has-caption -- 실시간 카메라 미리보기, 자막 대상 아님 */}
          <video
            ref={videoRef}
            muted
            playsInline
            style={{ width: '100%', maxWidth: layout.maxWidth, borderRadius: radius.lg, boxShadow: shadow.card }}
          />
          <p style={{ color: '#fff', fontSize: font.size.sm, margin: `${spacing.lg}px 0` }}>바코드를 카메라에 비춰주세요</p>
          <button
            type="button"
            className="tds-press"
            onClick={handleCancel}
            style={{
              padding: `${spacing.sm}px ${spacing.xl}px`,
              borderRadius: radius.pill,
              border: 'none',
              background: colors.surface,
              color: colors.textStrong,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            취소
          </button>
        </div>
      )}
    </>
  )
}
