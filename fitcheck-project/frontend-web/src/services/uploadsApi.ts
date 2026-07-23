import { apiPostForm } from './api';

const MEAL_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const MEAL_IMAGE_ACCEPT = ['image/jpeg', 'image/png', 'image/webp'] as const;

interface UploadMealImageResponse {
  success: boolean;
  data: { imageUrl: string };
}

export function validateMealImageFile(file: File): string | null {
  if (!MEAL_IMAGE_ACCEPT.includes(file.type as (typeof MEAL_IMAGE_ACCEPT)[number])) {
    return 'jpg, png, webp 이미지만 업로드할 수 있습니다.';
  }
  if (file.size > MEAL_IMAGE_MAX_BYTES) {
    return '이미지는 5MB 이하여야 합니다.';
  }
  return null;
}

export async function uploadMealImage(file: File): Promise<string> {
  const validationError = validateMealImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const formData = new FormData();
  formData.append('file', file);

  const res = await apiPostForm<UploadMealImageResponse>('/api/v1/uploads/meals', formData);
  return res.data.imageUrl;
}

export const MEAL_IMAGE_ACCEPT_ATTR = MEAL_IMAGE_ACCEPT.join(',');
