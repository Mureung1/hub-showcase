import { useState } from 'react'

// 사진이 있으면 보여주고, 없거나 로드에 실패하면 이모지로 자동 대체하는 공용 썸네일.
// MenuCard, RecipeDetailPage에서 같이 쓴다 (사진 처리 로직을 한 곳에만 둠).
function Thumbnail({ image, emoji, alt, className = '' }) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = Boolean(image) && !imageFailed

  if (showImage) {
    return (
      <img
        src={image}
        alt={alt}
        onError={() => setImageFailed(true)}
        className={`object-cover ${className}`}
      />
    )
  }

  return (
    <span className={`flex items-center justify-center bg-orange-50 ${className}`} aria-hidden="true">
      {emoji}
    </span>
  )
}

export default Thumbnail
