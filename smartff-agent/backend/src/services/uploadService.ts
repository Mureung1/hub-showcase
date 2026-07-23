import { supabase } from './supabaseClient';
import { CreateUploadInput, UploadRecord } from '../types/upload';

export async function createUpload(input: CreateUploadInput): Promise<UploadRecord> {
  const { data, error } = await supabase
    .from('uploads')
    .insert({
      category: input.category,
      filename: input.filename,
      status: input.status ?? '정상',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create upload: ${error.message}`);
  }

  return data as UploadRecord;
}

export async function updateUploadStatus(id: string, status: string): Promise<UploadRecord> {
  const { data, error } = await supabase
    .from('uploads')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update upload: ${error.message}`);
  }

  return data as UploadRecord;
}

export async function listUploads(): Promise<UploadRecord[]> {
  const { data, error } = await supabase
    .from('uploads')
    .select('*')
    .order('uploaded_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list uploads: ${error.message}`);
  }

  return data as UploadRecord[];
}

export async function deleteUpload(id: string): Promise<void> {
  const { error } = await supabase.from('uploads').delete().eq('id', id);

  if (error) {
    throw new Error(`Failed to delete upload: ${error.message}`);
  }
}
