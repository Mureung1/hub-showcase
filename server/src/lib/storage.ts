import { S3Client } from '@aws-sdk/client-s3'

// Supabase Storage는 S3 호환 API를 제공해서, 같은 프로젝트에 이미 있는
// Postgres(DB)와 스토리지를 한 서비스로 묶어 관리할 수 있다(별도 계정/자격증명 불필요).
const SUPABASE_URL = process.env.SUPABASE_URL ?? ''

export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? ''

export function buildPublicUrl(storageKey: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${storageKey}`
}

export const storageClient = new S3Client({
  region: process.env.SUPABASE_S3_REGION ?? 'ap-northeast-2',
  endpoint: `${SUPABASE_URL}/storage/v1/s3`,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.SUPABASE_S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.SUPABASE_S3_SECRET_ACCESS_KEY ?? '',
  },
})
