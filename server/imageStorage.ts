import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SupportedImageType } from "../lib/image";

const extensions: Record<SupportedImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type StoredImage = {
  path: string;
  publicUrl: string;
};

export async function uploadItemImage(
  supabase: SupabaseClient,
  bucket: string,
  file: { buffer: Buffer; mimetype: SupportedImageType }
): Promise<StoredImage> {
  const path = `${randomUUID()}.${extensions[file.mimetype]}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file.buffer, {
    contentType: file.mimetype,
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

export async function removeItemImage(
  supabase: SupabaseClient,
  bucket: string,
  path: string
) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}

export function getStoragePathFromPublicUrl(publicUrl: string, bucket: string) {
  try {
    const url = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${encodeURIComponent(bucket)}/`;
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex === -1) return null;
    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}
