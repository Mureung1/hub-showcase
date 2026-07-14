$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$errors = New-Object System.Collections.Generic.List[string]

function Add-Error {
  param([string]$Message)
  $errors.Add($Message) | Out-Null
}

function Require-File {
  param([string]$RelativePath)
  $path = Join-Path $root $RelativePath
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    Add-Error "Missing file: $RelativePath"
  }
}

function Require-Directory {
  param([string]$RelativePath)
  $path = Join-Path $root $RelativePath
  if (-not (Test-Path -LiteralPath $path -PathType Container)) {
    Add-Error "Missing directory: $RelativePath"
  }
}

function Get-RelativePath {
  param([string]$FullName)
  return $FullName.Substring($root.Length + 1).Replace("\", "/")
}

function Test-TomlFile {
  param([string]$RelativePath)

  $path = Join-Path $root $RelativePath
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    Add-Error "Missing TOML file: $RelativePath"
    return
  }

  $inMultilineString = $false
  $lineNumber = 0
  Get-Content -LiteralPath $path | ForEach-Object {
    $lineNumber += 1
    $line = $_
    $trimmed = $line.Trim()

    if ($inMultilineString) {
      if ($trimmed -match '"""$') {
        $inMultilineString = $false
      }
      return
    }

    if ($trimmed -eq "" -or $trimmed.StartsWith("#")) {
      return
    }

    if ($trimmed -match '^\[[A-Za-z0-9_.-]+\]$') {
      return
    }

    $keyValueMatch = [regex]::Match($trimmed, '^([A-Za-z0-9_.-]+)\s*=\s*(.+)$')
    if (-not $keyValueMatch.Success) {
      Add-Error "TOML syntax check failed at ${RelativePath}:${lineNumber}"
      return
    }

    $value = $keyValueMatch.Groups[2].Value.Trim()
    if ($value.StartsWith('"""')) {
      if ($value.Length -eq 3 -or -not $value.EndsWith('"""')) {
        $inMultilineString = $true
      }
      return
    }

    if ($value -match '^"([^"\\]|\\.)*"$' -or $value -match '^(true|false)$' -or $value -match '^-?\d+$') {
      return
    }

    Add-Error "Unsupported or invalid TOML value at ${RelativePath}:${lineNumber}"
  }

  if ($inMultilineString) {
    Add-Error "Unclosed TOML multiline string: $RelativePath"
  }
}

function Get-FrontmatterBlock {
  param([string]$Content)

  $match = [regex]::Match($Content, '(?s)^---\s*\r?\n(.*?)\r?\n---')
  if ($match.Success) {
    return $match.Groups[1].Value
  }

  return $null
}

function Get-FrontmatterList {
  param(
    [string]$Frontmatter,
    [string]$Field
  )

  $items = New-Object System.Collections.Generic.List[string]
  if ($null -eq $Frontmatter) {
    return $items
  }

  $lines = $Frontmatter -split "\r?\n"
  $inField = $false
  foreach ($line in $lines) {
    if ($line -match "^${Field}:") {
      $inField = $true
      continue
    }

    if ($inField) {
      if ($line -match '^\s+-\s+(.+?)\s*$') {
        $items.Add($Matches[1].Trim()) | Out-Null
        continue
      }

      if ($line -match '^\S') {
        break
      }
    }
  }

  return $items
}

Require-File ".codex/config.toml"
Require-Directory ".codex/agents"
Require-Directory ".agents/skills"
Require-File "docs/wiki/index.md"
Require-File "docs/wiki/log.md"

Test-TomlFile ".codex/config.toml"
$configContent = Get-Content -Raw -LiteralPath (Join-Path $root ".codex/config.toml")
$maxDepthMatch = [regex]::Match($configContent, '(?m)^max_depth\s*=\s*(\d+)')
if (-not $maxDepthMatch.Success -or [int]$maxDepthMatch.Groups[1].Value -gt 1) {
  Add-Error "Config max_depth must exist and stay at 1 or lower"
}

$maxThreadsMatch = [regex]::Match($configContent, '(?m)^max_threads\s*=\s*(\d+)')
if (-not $maxThreadsMatch.Success -or [int]$maxThreadsMatch.Groups[1].Value -gt 4) {
  Add-Error "Config max_threads must exist and stay at 4 or lower"
}

foreach ($field in @("auto_commit", "auto_push", "auto_deploy")) {
  if ($configContent -notmatch "(?m)^${field}\s*=\s*false\s*$") {
    Add-Error "Config field '$field' must be explicitly false"
  }
}

$agentNames = @{}
Get-ChildItem -LiteralPath (Join-Path $root ".codex/agents") -Filter "*.toml" -File | ForEach-Object {
  $relative = Get-RelativePath $_.FullName
  Test-TomlFile $relative
  $content = Get-Content -Raw -LiteralPath $_.FullName

  foreach ($field in @("name", "description", "sandbox_mode", "developer_instructions")) {
    if ($content -notmatch "(?m)^$field\s*=") {
      Add-Error "Agent file missing field '$field': $relative"
    }
  }

  $nameMatch = [regex]::Match($content, '(?m)^name\s*=\s*"([^"]+)"')
  if ($nameMatch.Success) {
    $name = $nameMatch.Groups[1].Value
    if ($agentNames.ContainsKey($name)) {
      Add-Error "Duplicate agent name '$name': $relative and $($agentNames[$name])"
    } else {
      $agentNames[$name] = $relative
    }
  }
}

$skillNames = @{}
$skillRoots = @(".agents/skills", "docs/codex-skills")
foreach ($skillRoot in $skillRoots) {
  $fullSkillRoot = Join-Path $root $skillRoot
  if (-not (Test-Path -LiteralPath $fullSkillRoot -PathType Container)) {
    Add-Error "Missing skill root: $skillRoot"
    continue
  }

Get-ChildItem -LiteralPath $fullSkillRoot -Filter "SKILL.md" -File -Recurse | ForEach-Object {
  $relative = Get-RelativePath $_.FullName
  $content = Get-Content -Raw -LiteralPath $_.FullName

  if ($content -notmatch '(?s)^---\s+.*?\s+---') {
    Add-Error "Skill missing YAML frontmatter: $relative"
    return
  }

  foreach ($field in @("name", "description")) {
    if ($content -notmatch "(?m)^${field}:\s*\S") {
      Add-Error "Skill missing frontmatter field '$field': $relative"
    }
  }

  $nameMatch = [regex]::Match($content, '(?m)^name:\s*([a-z0-9-]+)\s*$')
  if ($nameMatch.Success) {
    $name = $nameMatch.Groups[1].Value
    if ($skillNames.ContainsKey($name)) {
      Add-Error "Duplicate skill name '$name': $relative and $($skillNames[$name])"
    } else {
      $skillNames[$name] = $relative
    }
  }
}
}

$wikiRoot = Join-Path $root "docs/wiki"
$wikiIndex = Get-Content -Raw -LiteralPath (Join-Path $wikiRoot "index.md")
Get-ChildItem -LiteralPath $wikiRoot -Filter "*.md" -File -Recurse | ForEach-Object {
  $relative = Get-RelativePath $_.FullName
  $content = Get-Content -Raw -LiteralPath $_.FullName
  $frontmatter = Get-FrontmatterBlock $content

  if ($null -eq $frontmatter) {
    Add-Error "Wiki page missing frontmatter: $relative"
  }

  foreach ($field in @("title", "type", "status", "updated", "source_paths", "confidence", "tags")) {
    if ($content -notmatch "(?m)^${field}:") {
      Add-Error "Wiki page missing frontmatter field '$field': $relative"
    }
  }

  $sourcePaths = Get-FrontmatterList $frontmatter "source_paths"
  if ($sourcePaths.Count -eq 0) {
    Add-Error "Wiki page has empty source_paths: $relative"
  }

  foreach ($sourcePath in $sourcePaths) {
    if ($sourcePath -match '^(http|https)://') {
      continue
    }
    if ($sourcePath -notmatch '^[A-Za-z0-9_.\-/]+$') {
      Add-Error "Wiki source path has unsupported characters: $sourcePath in $relative"
      continue
    }

    $sourceFullPath = Join-Path $root $sourcePath
    if (-not (Test-Path -LiteralPath $sourceFullPath)) {
      Add-Error "Wiki source path does not exist: $sourcePath in $relative"
    }
  }

  $linkMatches = [regex]::Matches($content, '\]\(([^)#]+\.md)\)')
  foreach ($match in $linkMatches) {
    $linkPath = $match.Groups[1].Value
    $baseDir = Split-Path -Parent $_.FullName
    $fullLinkPath = Join-Path $baseDir $linkPath
    if (-not (Test-Path -LiteralPath $fullLinkPath -PathType Leaf)) {
      Add-Error "Broken Wiki markdown link '$linkPath' in $relative"
    }
  }

  if ($relative -ne "docs/wiki/index.md" -and $relative -ne "docs/wiki/log.md") {
    $indexKey = $relative.Replace("docs/wiki/", "")
    if ($wikiIndex -notmatch [regex]::Escape($indexKey)) {
      Add-Error "Wiki page not listed in index: $relative"
    }
  }
}

$logContent = Get-Content -Raw -LiteralPath (Join-Path $wikiRoot "log.md")
if ($logContent -notmatch '(?m)^- \d{4}-\d{2}-\d{2} \| ') {
  Add-Error "Wiki log has no dated append-only entries"
}

foreach ($docLink in @("docs/status.md", "docs/project-knowledge-map.md", "docs/README.md", "docs/tasks.md")) {
  Require-File $docLink
}

if ($errors.Count -gt 0) {
  Write-Host "Harness verification failed:" -ForegroundColor Red
  $errors | ForEach-Object { Write-Host "- $_" -ForegroundColor Red }
  exit 1
}

Write-Host "Harness verification passed." -ForegroundColor Green
