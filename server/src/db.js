// Supabase 조회 모듈. 저장소 접근은 이 파일 하나로 모은다.
// postings 는 자주 변하지 않으므로 첫 조회 후 메모리에 캐시한다.

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY
if (!url || !key) {
  throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY 가 .env 에 없습니다. server/.env.example 을 참고하세요.')
}

const supabase = createClient(url, key)

let cache = null

async function getPostings() {
  if (cache) return cache
  const { data, error } = await supabase.from('postings').select('*')
  if (error) throw new Error(`postings 조회 실패: ${error.message}`)
  cache = data
  return cache
}

function clearCache() {
  cache = null
}

module.exports = { getPostings, clearCache }
