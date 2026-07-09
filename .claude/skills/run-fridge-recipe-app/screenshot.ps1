# screenshot.ps1 — render a static HTML mockup to PNG with headless Chrome/Edge.
# Usage:
#   powershell -File screenshot.ps1                      # renders ../../../index.html
#   powershell -File screenshot.ps1 -Html path\to.html -Out out.png -Width 460 -Height 940
param(
  [string]$Html   = "",
  [string]$Out    = "",
  [int]$Width     = 460,
  [int]$Height    = 940
)

$ErrorActionPreference = "Stop"

# Resolve default HTML = the unit's index.html (skill dir is <unit>/.claude/skills/run-fridge-recipe-app)
$skillDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$unitDir  = (Resolve-Path (Join-Path $skillDir "..\..\..")).Path
if ([string]::IsNullOrWhiteSpace($Html)) { $Html = Join-Path $unitDir "index.html" }
if ([string]::IsNullOrWhiteSpace($Out))  { $Out  = Join-Path $skillDir "preview.png" }

$Html = (Resolve-Path $Html).Path
$fileUrl = "file:///" + ($Html -replace '\\','/')

# Chrome resolves a relative --screenshot path against ITS OWN cwd, not ours,
# so always hand it an absolute path (and make sure the target dir exists).
if (-not [System.IO.Path]::IsPathRooted($Out)) { $Out = Join-Path (Get-Location).Path $Out }
$Out = [System.IO.Path]::GetFullPath($Out)
$outDir = Split-Path -Parent $Out
if ($outDir -and -not (Test-Path $outDir)) { New-Item -ItemType Directory -Force -Path $outDir | Out-Null }

# Find a Chromium-family browser
$candidates = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
)
$browser = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $browser) { throw "No Chrome/Edge found. Install one or edit `$candidates." }

# Fresh temp profile avoids clobbering the user's real profile / locking.
$profile = Join-Path $env:TEMP ("chrome-shot-" + [guid]::NewGuid().ToString("N"))

$args = @(
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  "--force-device-scale-factor=2",   # crisp 2x screenshot
  "--user-data-dir=$profile",
  "--window-size=$Width,$Height",
  "--screenshot=$Out",
  "--virtual-time-budget=4000",      # let webfonts + SVG filter settle
  $fileUrl
)

& $browser @args | Out-Null
Remove-Item -Recurse -Force $profile -ErrorAction SilentlyContinue

if (Test-Path $Out) {
  Write-Output "OK  -> $Out  ($((Get-Item $Out).Length) bytes)  [$Width x $Height @2x]"
} else {
  throw "Screenshot not produced at $Out"
}
