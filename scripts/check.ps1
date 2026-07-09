$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Invoke-Checked {
  param(
    [string]$Label,
    [scriptblock]$Command
  )

  & $Command
  $exitCode = $LASTEXITCODE
  if ($exitCode -ne 0) {
    throw "$Label failed with exit code $exitCode."
  }
}

Write-Host "== LocalTwin harness check =="

Write-Host "== Python version =="
Invoke-Checked "Python version check" { python --version }

Write-Host "== Task packet check =="
Invoke-Checked "Task packet check" { python scripts/check_task_packet.py --root . }

Write-Host "== Docs index check =="
Invoke-Checked "Docs index check" { python scripts/check_docs_index.py }

Write-Host "== Docs HTML check =="
Invoke-Checked "Docs HTML check" { python scripts/check_docs_html.py }

Write-Host "== CI scope check =="
Invoke-Checked "CI scope check" { python scripts/check_ci_scope.py }

if (Get-Command node -ErrorAction SilentlyContinue) {
  Write-Host "== Doc viewer URL normalization check =="
  Invoke-Checked "Doc viewer URL normalization check" {
    node scripts/check_doc_viewer_normalization.js
  }
}

Write-Host "== Application checks =="
Invoke-Checked "Application checks" { pnpm check }

Write-Host "== Harness check passed =="
