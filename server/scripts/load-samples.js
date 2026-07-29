// 샘플 공고 적재 스크립트: server/data/*.sample.json → Supabase legacy_posting_samples 테이블
// 실행: server 폴더에서  node scripts/load-samples.js
// 같은 posting_id 는 덮어쓰므로(upsert) 여러 번 실행해도 안전하다.
//
// 대상 표는 폴백 전용 평면 표다. 정규화 `postings` 는 분석 경로의 표이므로 건드리지 않는다.

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const postings = require('../data/backend-postings.sample.json')

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY
if (!url || !key) {
  console.error('SUPABASE_URL / SUPABASE_SERVICE_KEY 가 .env 에 없습니다. .env.example 을 참고하세요.')
  process.exit(1)
}

const supabase = createClient(url, key)

async function main() {
  const rows = postings.map((p) => ({
    posting_id: p.posting_id,
    title: p.title,
    company: p.company,
    cluster_tag: p.cluster_tag,
    snapshot: p.snapshot,
    posted_at: p.posted_at,
    source: p.source,
    raw_text: p.raw_text ?? null,
    entry_label: p.entry_label,
    edu_label: p.edu_label,
    career_label: p.career_label,
    skills: p.skills,
    out_of_role_tags: p.out_of_role_tags,
    advanced_spans: p.advanced_spans,
    impl_level_signals: p.impl_level_signals,
    axis_mentions: p.axis_mentions,
    reality_tags: p.reality_tags,
    job_role_id: p.job_role_id ?? 'backend',
  }))

  const { error } = await supabase.from('legacy_posting_samples').upsert(rows)
  if (error) {
    console.error('적재 실패:', error.message)
    process.exit(1)
  }

  const { count, error: countError } = await supabase
    .from('legacy_posting_samples')
    .select('*', { count: 'exact', head: true })
  if (countError) {
    console.error('건수 확인 실패:', countError.message)
    process.exit(1)
  }
  console.log(`적재 완료: ${rows.length}건 업서트, 테이블 총 ${count}건`)
}

main()
