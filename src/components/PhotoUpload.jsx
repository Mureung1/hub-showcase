import { useRef, useState } from 'react'
import { colors, font, radius, spacing, styles } from '../styles/theme.js'

// 이미지를 긴 변 기준 maxSize(px)로 리사이즈해 base64로 변환.
// Gemini inline_data용으로 "data:image/...;base64," 접두어는 제거한 순수 데이터를 반환.
export function resizeImageToBase64(file, { maxSize = 1024, quality = 0.85 } = {}) {
  return new Promise((resolve, reject) => {
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
        canvas.getContext('2d').drawImage(img, 0, 0, targetWidth, targetHeight)

        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
        const dataUrl = canvas.toDataURL(mimeType, quality)
        const base64 = dataUrl.replace(/^data:[^;]+;base64,/, '')

        resolve({ base64, mimeType, dataUrl, width: targetWidth, height: targetHeight })
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

export default function PhotoUpload({ onChange, maxSize = 1024 }) {
  const inputRef = useRef(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [error, setError] = useState('')

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
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
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <div
        role="button"
        tabIndex={0}
        className="tds-press"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
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
            <span style={{ color: colors.textSub, fontSize: font.size.md, fontWeight: 600 }}>메뉴를 화면에 담고 촬영하세요</span>
          </>
        )}
      </div>
      {previewUrl && (
        <button
          type="button"
          className="tds-press"
          onClick={() => inputRef.current?.click()}
          style={{ ...styles.linkButton, display: 'block', marginTop: spacing.sm }}
        >
          다른 사진 선택
        </button>
      )}
      {error && <p style={styles.errorText}>{error}</p>}
    </div>
  )
}
