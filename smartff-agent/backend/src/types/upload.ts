export type UploadCategory = 'sales' | 'orders' | 'waste' | 'inventory' | 'hourly' | 'weekday';

export interface UploadRecord {
  id: string;
  category: string;
  filename: string;
  status: string;
  uploaded_at: string;
}

export interface CreateUploadInput {
  category: UploadCategory;
  filename: string;
  status?: string;
}
