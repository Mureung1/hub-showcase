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

Write-Host "== Docs HTML check =="
python scripts/check_docs_html.py

if (Get-Command node -ErrorAction SilentlyContinue) {
  Write-Host "== Doc viewer URL normalization check =="
  node scripts/check_doc_viewer_normalization.js
}

Write-Host "== Application checks =="
pnpm check

Write-Host "== Harness check passed =="
