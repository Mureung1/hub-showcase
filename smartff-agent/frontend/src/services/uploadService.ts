import type { UploadRecord } from '../types/upload';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };

export async function fetchUploads(): Promise<UploadRecord[]> {
  const response = await fetch(`${BASE_URL}/api/uploads`);
  const json = (await response.json()) as ApiResponse<UploadRecord[]>;

  if (!json.success) {
    throw new Error(json.error);
  }

  return json.data;
}

export async function createUpload(category: string, filename: string): Promise<UploadRecord> {
  const response = await fetch(`${BASE_URL}/api/uploads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ category, filename }),
  });

  const json = (await response.json()) as ApiResponse<UploadRecord>;

  if (!json.success) {
    throw new Error(json.error);
  }

  return json.data;
}
