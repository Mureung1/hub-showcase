import { useState } from 'react'

// 유튜브가 maxresdefault(고화질) 썸네일이 없는 영상에도 120x90짜리 회색 플레이스홀더 이미지를
// "정상 응답"(HTTP 404지만 유효한 JPEG 바디)으로 돌려줘서 onError가 안 걸린다 — 그래서 onLoad에서
// 실제 로드된 크기가 이 플레이스홀더 크기면 실패로 간주하고 대체 이미지로 넘어간다.
const PLACEHOLDER_WIDTH = 120

// 사진이 있으면 보여주고, 없거나 로드에 실패하면 이모지로 자동 대체하는 공용 썸네일.
// image가 유튜브 maxresdefault URL인데 그 영상엔 고화질 썸네일이 없으면(위 플레이스홀더 감지 또는 진짜 로드 실패),
// 이모지로 바로 넘어가지 않고 hqdefault(저화질이지만 항상 존재)로 한 번 더 시도한다.
// MenuCard, RecipeDetailPage에서 같이 쓴다 (사진 처리 로직을 한 곳에만 둠).
function Thumbnail({ image, emoji, alt, className = '' }) {
  const [stage, setStage] = useState('primary') // 'primary' | 'fallback' | 'emoji'
  const fallbackImage = image?.includes('maxresdefault.jpg') ? image.replace('maxresdefault.jpg', 'hqdefault.jpg') : null

  function fallBackOrEmoji() {
    setStage((prev) => (prev === 'primary' && fallbackImage ? 'fallback' : 'emoji'))
  }

  function handleLoad(event) {
    if (stage === 'primary' && fallbackImage && event.target.naturalWidth <= PLACEHOLDER_WIDTH) {
      fallBackOrEmoji()
    }
  }

  if (image && stage !== 'emoji') {
    return (
      <img
        src={stage === 'fallback' ? fallbackImage : image}
        alt={alt}
        onLoad={handleLoad}
        onError={fallBackOrEmoji}
        className={`object-cover ${className}`}
      />
    )
  }

  return (
    <span className={`flex items-center justify-center bg-bg-muted ${className}`} aria-hidden="true">
      {emoji}
    </span>
  )
}

export default Thumbnail
