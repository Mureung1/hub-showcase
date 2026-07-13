[CmdletBinding()]
param(
  [string]$Destination,
  [string]$DatabaseCredentialTarget = "ModuBrain/SupabaseDatabaseUrl",
  [ValidateRange(1, 90)]
  [int]$RetentionDays = 7
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$oneDriveRoot = if ($env:OneDriveConsumer) { $env:OneDriveConsumer } else { $env:OneDrive }
if (-not $Destination) {
  if (-not $oneDriveRoot) {
    throw "OneDrive was not found. Pass -Destination explicitly."
  }
  $Destination = Join-Path $oneDriveRoot "Modu Brain Backups\Supabase"
}
if (-not $env:MODU_BRAIN_AGE_RECIPIENT) {
  throw "MODU_BRAIN_AGE_RECIPIENT must contain the public age recipient."
}
if (-not (Get-Command age -ErrorAction SilentlyContinue)) {
  throw "age was not found. Install FiloSottile.age before scheduling backups."
}
if (-not (Get-Command tar -ErrorAction SilentlyContinue)) {
  throw "tar was not found."
}

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$previousRetention = $env:MODU_BRAIN_BACKUP_RETENTION_DAYS
$previousDatabaseUrl = $env:DATABASE_URL
$databaseUrlFile = $null
try {
  if (-not $env:DATABASE_URL) {
    $databaseUrlFile = Join-Path ([IO.Path]::GetTempPath()) ("modu-brain-db-" + [IO.Path]::GetRandomFileName())
    & (Join-Path $PSScriptRoot "windows-credential.ps1") `
      -Action Get `
      -Kind DatabaseUrl `
      -Target $DatabaseCredentialTarget `
      -OutputFile $databaseUrlFile
    $env:DATABASE_URL = [IO.File]::ReadAllText($databaseUrlFile).Trim()
    Remove-Item -LiteralPath $databaseUrlFile -Force
    $databaseUrlFile = $null
  }
  $env:MODU_BRAIN_BACKUP_RETENTION_DAYS = [string]$RetentionDays
  Push-Location $repositoryRoot
  try {
    & node "scripts/ops/backup-supabase.mjs" --destination $Destination
    if ($LASTEXITCODE -ne 0) {
      throw "Encrypted Supabase backup failed with exit code $LASTEXITCODE."
    }
  } finally {
    Pop-Location
  }
} finally {
  $env:MODU_BRAIN_BACKUP_RETENTION_DAYS = $previousRetention
  $env:DATABASE_URL = $previousDatabaseUrl
  if ($databaseUrlFile) {
    Remove-Item -LiteralPath $databaseUrlFile -Force -ErrorAction SilentlyContinue
  }
}
