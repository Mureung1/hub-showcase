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

Write-Host "== Harness check passed =="
