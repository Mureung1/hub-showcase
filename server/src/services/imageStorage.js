import { randomUUID } from "node:crypto";
import { supabase } from "../db/index.js";
import { ApiError } from "../utils/ApiError.js";

const BUCKET = "post-images";

// 서버 시작 시 한 번 호출 — 버킷이 없으면 만든다(수동으로 Supabase 콘솔에서
// 만들 필요 없게). public: true라 업로드된 이미지 URL은 로그인 없이 누구나 볼
// 수 있다(블로그 썸네일 용도라 비공개일 이유가 없음).
export async function ensureImageBucketExists() {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error(`Storage 버킷 목록 조회 실패: ${listError.message}`);
    return;
  }
  if (buckets.some((bucket) => bucket.name === BUCKET)) return;

  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: "5MB",
  });
  if (error) {
    console.error(`Storage 버킷(${BUCKET}) 생성 실패: ${error.message}`);
  }
}

export async function uploadPostImage(postId, file) {
  const ext = file.originalname.split(".").pop();
  const path = `${postId}/${randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file.buffer, {
    contentType: file.mimetype,
  });
  if (error) throw new ApiError(500, "IMAGE_UPLOAD_FAILED", error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
