[CmdletBinding()]
param(
  [string]$TestEmail = "modu-brain-e2e@example.test"
)

$ErrorActionPreference = "Stop"
$SupabaseVersion = "2.109.1"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker를 찾을 수 없습니다. Docker Desktop 엔진을 준비한 뒤 다시 실행하세요. 원격 Supabase는 사용하지 않습니다."
}

docker version *> $null
if ($LASTEXITCODE -ne 0) {
  throw "Docker 엔진이 실행 중이 아닙니다. Docker Desktop을 연 뒤 다시 실행하세요."
}

& npx --yes "supabase@$SupabaseVersion" start
if ($LASTEXITCODE -ne 0) { throw "로컬 Supabase 시작에 실패했습니다." }

& npx --yes "supabase@$SupabaseVersion" db reset
if ($LASTEXITCODE -ne 0) { throw "로컬 migration과 seed 적용에 실패했습니다." }

& npx --yes "supabase@$SupabaseVersion" test db
if ($LASTEXITCODE -ne 0) { throw "로컬 pgTAP 정책 테스트에 실패했습니다." }

$localEnv = @{}
& npx --yes "supabase@$SupabaseVersion" status -o env | ForEach-Object {
  if ($_ -match '^([A-Z_]+)="?(.*?)"?$') {
    $localEnv[$Matches[1]] = $Matches[2]
  }
}

foreach ($required in @("API_URL", "ANON_KEY", "SERVICE_ROLE_KEY")) {
  if (-not $localEnv.ContainsKey($required)) {
    throw "로컬 Supabase 상태에서 $required 값을 확인하지 못했습니다."
  }
}

$env:SUPABASE_URL = $localEnv.API_URL
$env:SUPABASE_ANON_KEY = $localEnv.ANON_KEY
$env:SUPABASE_SERVICE_ROLE_KEY = $localEnv.SERVICE_ROLE_KEY
$env:VITE_SUPABASE_URL = $localEnv.API_URL
$env:VITE_SUPABASE_ANON_KEY = $localEnv.ANON_KEY
$env:E2E_TEST_EMAIL = $TestEmail
$env:E2E_SKIP_LOGIN_EMAIL_SEND = "true"
$env:MODU_BRAIN_ANALYSIS_PROVIDER = "local-heuristic"
$env:IP_HASH_SECRET = "local-auth-e2e-only-secret"

& npx playwright test tests/e2e/authenticated-flow.spec.ts
if ($LASTEXITCODE -ne 0) { throw "인증 FE-BE-DB Playwright 흐름에 실패했습니다." }

Write-Host "로컬 Supabase 정책과 인증 FE-BE-DB 새로고침 흐름이 통과했습니다."
