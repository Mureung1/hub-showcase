import { useState } from "react";

function isSafeImageUrl(value) {
  if (!value) return false;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function ProductImage({ category, className = "", imageUrl, name }) {
  const [failedUrl, setFailedUrl] = useState("");
  const failed = failedUrl === imageUrl;

  if (!isSafeImageUrl(imageUrl) || failed) {
    return (
      <div className={`product-image-fallback ${className}`.trim()} aria-label={`${name} 이미지 없음`}>
        <span>{category}</span>
        <strong>{name?.slice(0, 1) || "?"}</strong>
        <small>CAMPUS CART</small>
      </div>
    );
  }

  return (
    <div className={`product-image-wrap ${className}`.trim()}>
      <img alt={name} loading="lazy" onError={() => setFailedUrl(imageUrl)} src={imageUrl} />
    </div>
  );
}

export default ProductImage;
