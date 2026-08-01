/**
 * Master Data Sync Service
 * Render 무료 인스턴스는 파일시스템이 ephemeral이라, ETL로 재생성한 data/master/*.csv와
 * 업로드된 원본 data/raw/{sales,waste}/*.xlsx가 서버 재시작(슬립 복귀·재배포) 시 사라지고
 * Docker 이미지에 구워진 초기 데이터로 되돌아간다.
 * 원본 raw 파일이 사라지면 ETL이 "그 시점에 남아있는 파일만" 재집계해 마스터 데이터셋을 덮어써서
 * 이전에 업로드했던 달의 데이터가 통째로 사라지는 문제가 생긴다.
 * 이를 막기 위해 ETL 성공 시 결과 CSV와 원본 raw 파일을 모두 Supabase Storage에 백업하고,
 * 서버 기동 시 그 백업을 로컬로 복원한 뒤 각 서비스/ETL이 이를 읽도록 한다.
 */

import fs from 'fs';
import path from 'path';
import { supabase } from './supabaseClient';

const BUCKET = 'master-dataset';
const REPO_ROOT = path.join(__dirname, '../../..');
const MASTER_DIR = path.join(REPO_ROOT, 'data/master');
const SYNCED_FILES = ['merged_dataset.csv', 'weekday_sales.csv', 'hourly_sales.csv', 'sales.csv', 'waste.csv'];
// 월별로 누적되어야 하는 업로드 원본. 파일명이 매번 달라지므로(월/상품군 조합) 고정 목록이 아니라
// 디렉토리 전체를 대상으로 목록을 조회해 동기화한다.
const RAW_SYNC_DIRS: { local: string; prefix: string }[] = [
  { local: path.join(REPO_ROOT, 'data/raw/sales'), prefix: 'raw/sales' },
  { local: path.join(REPO_ROOT, 'data/raw/waste'), prefix: 'raw/waste' },
];

async function ensureBucket(): Promise<void> {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw error;

  if (!buckets.some((b) => b.name === BUCKET)) {
    const { error: createError } = await supabase.storage.createBucket(BUCKET, { public: false });
    if (createError) throw createError;
  }
}

// 서버 기동 시 1회 호출 — 백업이 있으면 로컬 data/master/*.csv를 덮어써서 복원한다.
// 백업이 없거나(최초 배포) Supabase 연결 실패 시에는 이미지에 구워진 기존 CSV를 그대로 쓴다.
export async function restoreFromSupabase(): Promise<void> {
  try {
    await ensureBucket();

    for (const filename of SYNCED_FILES) {
      const { data, error } = await supabase.storage.from(BUCKET).download(filename);
      if (error || !data) continue;

      const buffer = Buffer.from(await data.arrayBuffer());
      fs.mkdirSync(MASTER_DIR, { recursive: true });
      fs.writeFileSync(path.join(MASTER_DIR, filename), buffer);
      console.log(`[MasterDataSync] Restored ${filename} from Supabase`);
    }

    for (const { local, prefix } of RAW_SYNC_DIRS) {
      const { data: entries, error } = await supabase.storage.from(BUCKET).list(prefix);
      if (error || !entries) continue;

      fs.mkdirSync(local, { recursive: true });
      for (const entry of entries) {
        const { data, error: downloadError } = await supabase.storage
          .from(BUCKET)
          .download(`${prefix}/${entry.name}`);
        if (downloadError || !data) continue;

        const buffer = Buffer.from(await data.arrayBuffer());
        fs.writeFileSync(path.join(local, entry.name), buffer);
      }
      console.log(`[MasterDataSync] Restored ${entries.length} file(s) into ${prefix} from Supabase`);
    }
  } catch (err) {
    console.warn(
      `[MasterDataSync] Restore skipped (Supabase 연결 실패, 이미지에 구워진 기존 데이터 사용): ${
        err instanceof Error ? err.message : err
      }`
    );
  }
}

// ETL 성공 직후 호출 — 방금 재생성된 CSV를 Supabase Storage에 백업해서
// 다음 서버 재시작 이후에도 이번 업로드 결과가 유지되도록 한다.
export async function persistToSupabase(): Promise<void> {
  try {
    await ensureBucket();

    for (const filename of SYNCED_FILES) {
      const filePath = path.join(MASTER_DIR, filename);
      if (!fs.existsSync(filePath)) continue;

      const buffer = fs.readFileSync(filePath);
      const { error } = await supabase.storage.from(BUCKET).upload(filename, buffer, {
        contentType: 'text/csv',
        upsert: true,
      });
      if (error) throw error;
    }

    for (const { local, prefix } of RAW_SYNC_DIRS) {
      if (!fs.existsSync(local)) continue;

      for (const filename of fs.readdirSync(local)) {
        const buffer = fs.readFileSync(path.join(local, filename));
        const { error } = await supabase.storage.from(BUCKET).upload(`${prefix}/${filename}`, buffer, {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          upsert: true,
        });
        if (error) throw error;
      }
    }

    console.log('[MasterDataSync] Persisted master dataset to Supabase');
  } catch (err) {
    console.warn(
      `[MasterDataSync] Persist failed (다음 서버 재시작 시 이번 업로드 데이터가 사라질 수 있음): ${
        err instanceof Error ? err.message : err
      }`
    );
  }
}
