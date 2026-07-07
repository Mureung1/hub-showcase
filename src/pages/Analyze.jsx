import { useState } from 'react'
import PhotoUpload from '../components/PhotoUpload.jsx'

export default function Analyze() {
  const [photo, setPhoto] = useState(null) // { base64, mimeType, dataUrl, width, height }
  const [menuName, setMenuName] = useState('')
  const [brand, setBrand] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleAnalyze() {
    setError('')

    if (!photo) {
      setError('사진을 먼저 업로드해주세요.')
      return
    }

    console.log('base64 preview:', photo.base64.slice(0, 50))
    console.log('menuName:', menuName)
    console.log('brand:', brand)

    // TODO: 다음 단계(F3)에서 geminiComplete 호출로 교체. 지금은 로딩 상태 자리만 확인.
    setLoading(true)
    setTimeout(() => setLoading(false), 400)
  }

  return (
    <div style={{ maxWidth: 420, margin: '40px auto', padding: 24 }}>
      <h1>사진 분석</h1>

      <PhotoUpload onChange={setPhoto} />

      <div style={{ marginTop: 16, marginBottom: 12 }}>
        <label htmlFor="menuName">메뉴명 (선택)</label>
        <input
          id="menuName"
          value={menuName}
          onChange={(e) => setMenuName(e.target.value)}
          style={{ width: '100%', display: 'block' }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label htmlFor="brand">브랜드 (선택)</label>
        <input
          id="brand"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          style={{ width: '100%', display: 'block' }}
        />
      </div>

      <button type="button" onClick={handleAnalyze} disabled={loading} style={{ width: '100%' }}>
        {loading ? '분석 중...' : '분석하기'}
      </button>

      {loading && <p style={{ marginTop: 12 }}>분석 중입니다...</p>}
      {error && <p style={{ color: 'red', marginTop: 12 }}>{error}</p>}
    </div>
  )
}
