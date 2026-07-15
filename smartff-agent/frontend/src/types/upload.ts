export type UploadCategory = 'sales' | 'orders' | 'waste' | 'inventory' | 'hourly' | 'weekday';

export interface UploadRecord {
  id: string;
  category: string;
  filename: string;
  status: string;
  uploaded_at: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
