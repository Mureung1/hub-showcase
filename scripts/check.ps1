$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "== LocalTwin harness check =="

Write-Host "== Python version =="
python --version

Write-Host "== Task packet check =="
python scripts/check_task_packet.py --root .

Write-Host "== Docs index check =="
python scripts/check_docs_index.py

if (Test-Path "intro-page/package.json") {
  Write-Host "== intro-page build =="
  Push-Location intro-page
  npm run build
  Pop-Location
}

Write-Host "== Harness check passed =="
