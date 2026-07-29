// Supabase 조회 모듈. 저장소 접근은 이 파일 하나로 모은다.
//
// Phase 22 부터 화면 조회는 **활성 분석 버전의 `analysis_outputs.payload`** 를 읽는다
// (CONTRACT 4장). Express 는 집계하지 않고 에이전트도 부르지 않는다.
// 평면 표를 읽던 옛 경로는 `legacy_posting_samples` 로 이름만 남아 폴백에 쓰인다.
//
// 클라이언트는 지연 생성한다. 환경변수 없이 이 모듈을 불러오는 테스트가 가능해야 하고,
// 조회 함수는 전부 주입 가능한 형태로 index.js 에 넘어간다.

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

let client = null

function supabase() {
  if (client) return client
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY 가 .env 에 없습니다. server/.env.example 을 참고하세요.')
  }
  client = createClient(url, key)
  return client
}

// 조회 실패는 전부 같은 코드로 올린다. 라우트가 503 으로 바꾼다.
function unavailable(what, error) {
  const dbError = new Error(`${what} 조회 실패: ${error.message}`)
  dbError.code = 'DB_UNAVAILABLE'
  return dbError
}

// 활성 분석 버전. 없으면 null 이다. 없다는 사실을 오류로 바꾸지 않는다 —
// 라우트가 503 NO_ACTIVE_ANALYSIS 로 구분해서 답한다.
async function getActiveAnalysis(jobRoleId) {
  const { data, error } = await supabase()
    .from('active_analysis_versions')
    .select('job_role_id, analysis_version, activated_at')
    .eq('job_role_id', jobRoleId)
    .maybeSingle()
  if (error) throw unavailable('active_analysis_versions', error)
  return data ? data.analysis_version : null
}

// 산출물 한 행의 payload. `(analysis_version, scope_level, scope_id, output_type)` 이 유일키다.
async function getOutput(analysisVersion, scopeLevel, scopeId, outputType) {
  const { data, error } = await supabase()
    .from('analysis_outputs')
    .select('payload')
    .eq('analysis_version', analysisVersion)
    .eq('scope_level', scopeLevel)
    .eq('scope_id', scopeId)
    .eq('output_type', outputType)
    .maybeSingle()
  if (error) throw unavailable('analysis_outputs', error)
  return data ? data.payload : null
}

// 화면 선택지용 직무 목록. `is_active` 인 직무만 낸다.
// `supported` 는 활성 분석 버전이 있는지 여부다. 활성 버전이 없는 직무는
// 화면에서 고를 수는 있어도 결과가 없으므로 이 값으로 구분해 표시한다.
async function getJobRoles() {
  const { data, error } = await supabase()
    .from('job_roles')
    .select('job_role_id, display_name, active_analysis_versions(analysis_version)')
    .eq('is_active', true)
    .order('job_role_id')
  if (error) throw unavailable('job_roles', error)
  return (data || []).map((row) => ({
    job_role_id: row.job_role_id,
    display_name: row.display_name,
    supported: Array.isArray(row.active_analysis_versions)
      ? row.active_analysis_versions.length > 0
      : Boolean(row.active_analysis_versions),
  }))
}

// 기업군 카탈로그. React 는 기업군을 **표시명**으로 보내고(CONTRACT 5.B)
// `analysis_outputs.scope_id` 는 `cluster_id` 이므로 표시명↔식별자 대응이 필요하다.
async function getClusters() {
  const { data, error } = await supabase()
    .from('company_clusters')
    .select('cluster_id, display_name, sort_order')
    .order('sort_order')
  if (error) throw unavailable('company_clusters', error)
  return data || []
}

// 한 기업군의 공고 목록. 화면의 공고 선택지다.
// 선택지는 "해석 산출물이 있는 공고" 로 한정한다. 저장된 posting 범위 해석이 없는 공고를
// 목록에 넣으면 고르는 순간 폴백으로 떨어져 다른 범위의 결과가 보인다.
async function getPostingsInCluster(jobRoleId, clusterId) {
  const db = supabase()

  const memberships = await db
    .from('company_cluster_memberships')
    .select('company_id')
    .eq('cluster_id', clusterId)
    .is('valid_to', null)
  if (memberships.error) throw unavailable('company_cluster_memberships', memberships.error)
  const companyIds = (memberships.data || []).map((row) => row.company_id)
  if (companyIds.length === 0) return []

  const postings = await db
    .from('postings')
    .select('posting_id, company_id')
    .eq('job_role_id', jobRoleId)
    .in('company_id', companyIds)
  if (postings.error) throw unavailable('postings', postings.error)
  const rows = postings.data || []
  if (rows.length === 0) return []

  const analysisVersion = await getActiveAnalysis(jobRoleId)
  if (!analysisVersion) return []

  const outputs = await db
    .from('analysis_outputs')
    .select('scope_id')
    .eq('analysis_version', analysisVersion)
    .eq('scope_level', 'posting')
    .eq('output_type', 'interpretation')
    .in('scope_id', rows.map((row) => row.posting_id))
  if (outputs.error) throw unavailable('analysis_outputs', outputs.error)
  const analyzed = new Set((outputs.data || []).map((row) => row.scope_id))

  const selected = rows.filter((row) => analyzed.has(row.posting_id))
  if (selected.length === 0) return []

  const versions = await db
    .from('posting_versions')
    .select('posting_id, title, posted_at')
    .in('posting_id', selected.map((row) => row.posting_id))
    .order('posted_at', { ascending: false })
  if (versions.error) throw unavailable('posting_versions', versions.error)

  const companies = await db
    .from('companies')
    .select('company_id, display_name')
    .in('company_id', selected.map((row) => row.company_id))
  if (companies.error) throw unavailable('companies', companies.error)
  const companyName = new Map((companies.data || []).map((row) => [row.company_id, row.display_name]))

  // 한 공고에 버전이 여럿이면 가장 최근 것만 쓴다.
  const latest = new Map()
  for (const version of versions.data || []) {
    if (!latest.has(version.posting_id)) latest.set(version.posting_id, version)
  }

  return selected
    .map((row) => {
      const version = latest.get(row.posting_id)
      return {
        posting_id: row.posting_id,
        company: companyName.get(row.company_id) || row.company_id,
        title: version ? version.title : null,
        posted_at: version ? version.posted_at : null,
      }
    })
    .sort((a, b) => (String(a.posted_at) < String(b.posted_at) ? 1 : -1))
}

// 폴백 전용. 수직 슬라이스가 쓰던 평면 표이며 분석 모집단이 아니다.
// 정규화 `postings` 와 이름이 겹쳐 마이그레이션 0025 가 이 이름으로 옮겼다.
async function getLegacyPostingSamples(jobRoleId = 'backend') {
  const { data, error } = await supabase()
    .from('legacy_posting_samples')
    .select('*')
    .eq('job_role_id', jobRoleId)
  if (error) throw unavailable('legacy_posting_samples', error)
  return data || []
}

module.exports = {
  getActiveAnalysis,
  getOutput,
  getJobRoles,
  getClusters,
  getPostingsInCluster,
  getLegacyPostingSamples,
}
