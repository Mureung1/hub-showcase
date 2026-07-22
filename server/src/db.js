// Supabase 조회 모듈. 저장소 접근은 이 파일 하나로 모은다.
// 데이터 갱신이 즉시 반영되도록 공고는 요청마다 조회한다.

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY
if (!url || !key) {
  throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY 가 .env 에 없습니다. server/.env.example 을 참고하세요.')
}

const supabase = createClient(url, key)

async function getPostings() {
  const { data, error } = await supabase.from('postings').select('*')
  if (error) {
    const dbError = new Error(`postings 조회 실패: ${error.message}`)
    dbError.code = 'DB_UNAVAILABLE'
    throw dbError
  }
  return data
}

module.exports = { getPostings }
