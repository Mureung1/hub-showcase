import { useRef, useState } from 'react'
import { useFocusTrap } from '../lib/useFocusTrap.js'
import { isApk } from '../utils/platform.js'
import { colors, font, layout, radius, shadow, spacing, styles } from '../styles/theme.js'

// 이미지를 긴 변 기준 maxSize(px)로 리사이즈해 base64로 변환.
// Gemini inline_data용으로 "data:image/...;base64," 접두어는 제거한 순수 데이터를 반환.
// 이 크기를 넘는 파일은 리사이즈 전에 걸러낸다 — 그대로 FileReader.readAsDataURL에 넘기면 실제
// 사진(수십MB 스캔본)이 아니라 잘못 선택된 대용량 파일(동영상 등)일 때 브라우저 탭이 한동안 멎어 보일 수 있다.
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024

export function resizeImageToBase64(file, { maxSize = 1024, quality = 0.85 } = {}) {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      reject(new Error('파일 용량이 너무 큽니다(최대 20MB). 다른 사진을 선택해주세요.'))
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('이미지를 불러오지 못했습니다.'))
      img.onload = () => {
        const { width, height } = img
        const longSide = Math.max(width, height)
        const scale = longSide > maxSize ? maxSize / longSide : 1
        const targetWidth = Math.round(width * scale)
        const targetHeight = Math.round(height * scale)

        const canvas = document.createElement('canvas')
        canvas.width = targetWidth
        canvas.height = targetHeight
        const ctx = canvas.getContext('2d')
        // 투명 픽셀은 JPEG에서 검게 나온다 — 흰 배경을 먼저 깔고 그린다.
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, targetWidth, targetHeight)
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

        // **항상 JPEG로 내보낸다.** toDataURL의 quality 인자는 손실 포맷(jpeg/webp)에만 적용되므로
        // 예전처럼 PNG 입력을 PNG로 유지하면 0.85 압축이 아예 안 걸린다 — 1024px로 줄여도 사진성
        // PNG는 base64 2MB를 넘고, 느린 회선에서 업로드만으로 28초 타임아웃을 넘긴다. 안드로이드
        // 스크린샷이 전부 PNG라 '갤러리에서 선택'이 생기면서 실사용 경로가 됐다. 어차피 캔버스로
        // 재인코딩하는 데다 음식 사진에 투명도가 필요할 일이 없어 원본 포맷을 유지할 이유가 없다.
        const mimeType = 'image/jpeg'
        const dataUrl = canvas.toDataURL(mimeType, quality)
        const base64 = dataUrl.replace(/^data:[^;]+;base64,/, '')

        resolve({ base64, mimeType, dataUrl, width: targetWidth, height: targetHeight })
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

// 사진 출처 선택 시트 — **APK에서만** 뜬다(아래 openPicker 주석 참고).
// ConfirmDialog와 같은 시트 스타일·포커스 트랩을 쓴다.
function PhotoSourceSheet({ onPick, onCancel }) {
  const containerRef = useFocusTrap(true, onCancel)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-source-title"
      ref={containerRef}
      tabIndex={-1}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        background: 'rgba(25, 31, 40, 0.45)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: layout.pagePaddingX,
      }}
      onClick={onCancel}
    >
      <div
        className="tds-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: layout.maxWidth,
          background: colors.surface,
          borderRadius: radius.lg,
          boxShadow: shadow.card,
          padding: spacing.xl,
          marginBottom: `calc(${spacing.xl}px + env(safe-area-inset-bottom))`,
          boxSizing: 'border-box',
        }}
      >
        <h3 id="photo-source-title" style={{ margin: `0 0 ${spacing.xs}px`, fontSize: font.size.lg, color: colors.textStrong }}>
          사진 가져오기
        </h3>
        {/* 카메라 권한을 거부하면(특히 "다시 묻지 않음") 웹뷰가 파일 선택창을 아예 안 띄우고 change
            이벤트도 안 준다 — 눌러도 아무 일이 없는 막다른 길이 된다. 그때 빠져나갈 길을 미리 알려둔다.
            "촬영을 눌렀는데 응답이 없으면 경고"식 타이머 감지는 사용자가 카메라를 그냥 취소한 정상
            상황과 구분할 수 없어(오탐) 쓰지 않았다. */}
        <p style={{ margin: `0 0 ${spacing.lg}px`, fontSize: font.size.xs, color: colors.textSub }}>
          카메라가 열리지 않으면 갤러리에서 선택해주세요.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
          {[
            { key: 'camera', label: '카메라로 촬영', desc: '지금 바로 찍어서 분석해요' },
            { key: 'gallery', label: '갤러리에서 선택', desc: '이미 찍어둔 사진을 골라요' },
          ].map(({ key, label, desc }) => (
            <button
              key={key}
              type="button"
              className="tds-press"
              onClick={() => onPick(key)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                background: colors.bg,
                border: 'none',
                borderRadius: radius.md,
                padding: `${spacing.md}px ${spacing.lg}px`,
                cursor: 'pointer',
              }}
            >
              <span style={{ display: 'block', fontSize: font.size.md, fontWeight: 700, color: colors.textStrong }}>{label}</span>
              <span style={{ display: 'block', marginTop: 2, fontSize: font.size.xs, color: colors.textSub }}>{desc}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="tds-press"
          onClick={onCancel}
          style={{
            display: 'block',
            margin: `${spacing.md}px auto 0`,
            background: 'none',
            border: 'none',
            fontSize: font.size.sm,
            fontWeight: 600,
            padding: 0,
            color: colors.muted,
            cursor: 'pointer',
          }}
        >
          취소
        </button>
      </div>
    </div>
  )
}

export default function PhotoUpload({
  onChange,
  maxSize = 1024,
  placeholderText = '메뉴를 화면에 담고 촬영하세요',
  hintText = '사진 없이 분석 가능',
}) {
  // 두 input의 차이는 `capture` 하나뿐이다. 안드로이드 웹뷰(Capacitor)의 BridgeWebChromeClient는
  // `onShowFileChooser`에서 `fileChooserParams.isCaptureEnabled()`를 보고 갈라진다 —
  // capture가 있으면 ACTION_IMAGE_CAPTURE(카메라)를, 없으면 파일 피커(갤러리)를 띄운다.
  // 그래서 네이티브 플러그인(@capacitor/camera) 없이 웹 표준 속성만으로 두 경로가 다 열린다.
  // ⚠️ 이게 중요한 이유: 이 앱은 capacitor.config.json이 서버 URL 모드라 웹 배포만으로 앱이 갱신된다.
  // 네이티브 플러그인을 새로 넣으면 그 성질이 깨지고 APK 재빌드·재배포가 필요해진다.
  const cameraInputRef = useRef(null)
  const galleryInputRef = useRef(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [error, setError] = useState('')
  const [sourceSheetOpen, setSourceSheetOpen] = useState(false)

  // 출처 선택 시트는 **APK에서만** 띄운다. 모바일 브라우저는 `<input accept="image/*">`를 누르면
  // OS가 이미 "카메라/갤러리" 선택지를 주므로 시트를 겹치면 탭만 하나 늘어난다. 반대로 웹뷰의
  // 파일 피커에는 카메라 항목이 아예 없어서(위 showFilePicker) 앱에서만 선택지가 필요했다.
  function openPicker() {
    if (isApk()) {
      setSourceSheetOpen(true)
      return
    }
    galleryInputRef.current?.click()
  }

  function pickSource(source) {
    setSourceSheetOpen(false)
    const ref = source === 'camera' ? cameraInputRef : galleryInputRef
    // 시트가 닫히면서 포커스가 되돌아가는 동안 click을 걸면 안드로이드 웹뷰에서 파일 선택창이
    // 뜨지 않는 경우가 있어, 렌더가 끝난 뒤로 한 틱 미룬다.
    setTimeout(() => ref.current?.click(), 0)
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    // 값을 비워야 "같은 사진을 다시 선택"해도 change가 다시 발생한다(카메라 재촬영 시에도 동일).
    e.target.value = ''
    if (!file) return

    setError('')
    try {
      const result = await resizeImageToBase64(file, { maxSize })
      setPreviewUrl(result.dataUrl)
      onChange?.(result)
    } catch (err) {
      setPreviewUrl(null)
      setError(err.message || '이미지를 처리하지 못했습니다.')
      onChange?.(null)
    }
  }

  return (
    <div>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        data-testid="photo-input-camera"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        data-testid="photo-input-gallery"
      />
      {sourceSheetOpen && <PhotoSourceSheet onPick={pickSource} onCancel={() => setSourceSheetOpen(false)} />}
      <div
        role="button"
        tabIndex={0}
        className="tds-press"
        onClick={openPicker}
        onKeyDown={(e) => e.key === 'Enter' && openPicker()}
        style={{
          cursor: 'pointer',
          borderRadius: radius.md,
          overflow: 'hidden',
          background: colors.bg,
          minHeight: 240,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
        }}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="업로드한 사진 미리보기"
            style={{ width: '100%', display: 'block' }}
          />
        ) : (
          <>
            <span style={{ fontSize: 48 }}>📷</span>
            <span style={{ color: colors.textSub, fontSize: font.size.md, fontWeight: 600 }}>{placeholderText}</span>
            {hintText && <span style={{ color: colors.muted, fontSize: font.size.xs }}>{hintText}</span>}
          </>
        )}
      </div>
      {previewUrl && (
        <button
          type="button"
          className="tds-press"
          onClick={openPicker}
          style={{ ...styles.linkButton, display: 'block', marginTop: spacing.sm }}
        >
          다른 사진 선택
        </button>
      )}
      {error && <p style={styles.errorText}>{error}</p>}
    </div>
  )
}
