export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number];

export function isSupportedImageType(value: string): value is SupportedImageType {
  return SUPPORTED_IMAGE_TYPES.includes(value as SupportedImageType);
}

export function getImageValidationError(file: { type: string; size: number }) {
  if (!isSupportedImageType(file.type)) {
    return "JPEG, PNG, WebP 이미지만 선택할 수 있습니다.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "이미지는 최대 5MB까지 선택할 수 있습니다.";
  }
  return null;
}
