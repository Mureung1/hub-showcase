import { useEffect, useRef, useState } from 'react'

function PhotoUpload({ file, onChange }) {
  const inputRef = useRef(null)
  const [previewUrl, setPreviewUrl] = useState('')

  useEffect(() => {
    if (!file) {
      setPreviewUrl('')
      return undefined
    }

    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function handleFileChange(event) {
    onChange(event.target.files?.[0] || null)
    event.target.value = ''
  }

  return (
    <div className="photo-upload">
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        aria-label="사진 첨부"
      />
      {file ? (
        <div className="photo-preview">
          <img src={previewUrl} alt="첨부한 사진 미리보기" />
          <button className="photo-remove" type="button" onClick={() => onChange(null)} aria-label="사진 제거">✕</button>
        </div>
      ) : (
        <button className="photo-add-btn" type="button" onClick={() => inputRef.current?.click()}>
          📷 사진 추가
        </button>
      )}
    </div>
  )
}

export default PhotoUpload
