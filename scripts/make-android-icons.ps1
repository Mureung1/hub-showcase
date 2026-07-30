# 런처 아이콘·스플래시를 branding/symbol image.png 에서 생성한다.
#
#   powershell -ExecutionPolicy Bypass -File scripts\make-android-icons.ps1
#
# 왜 손으로 만든 스크립트인가: @capacitor/assets 는 sharp(네이티브 바이너리)를 끌고 오는데,
# 이 저장소가 필요한 건 "이미 있는 심볼을 규격에 맞춰 자르고 줄이는" 일회성 작업뿐이다.
# 대신 **재현 가능해야** 한다 — 아이콘을 다시 뽑을 일이 생겼을 때 원본 크롭 좌표와 여백
# 비율을 기억에 의존하면 다음 판이 미묘하게 달라진다.
#
# 원본(branding/symbol image.png, 2048x2048)은 하단에 "FAVICON (512x512 PNG) - Option 2
# Symbol" 캡션이 박힌 시안 이미지라 그대로 쓰면 캡션까지 아이콘에 들어간다. 그래서 심볼의
# 경계상자를 픽셀로 찾아내되 **캡션이 있는 아래쪽은 스캔 범위에서 뺀다**(행별 비배경 픽셀
# 수를 세면 심볼 54~206행 / 빈 띠 207~233행 / 캡션 234~243행으로 뚜렷하게 갈린다).
#
# Windows 전용(System.Drawing). 이 저장소의 다른 스크립트는 node .mjs지만, node에는 PNG
# 디코더가 없어서 의존성 없이 하려면 이 길뿐이다. 결과물(PNG)은 커밋되므로 다른 OS에서
# 개발하더라도 이 스크립트를 돌릴 일은 없다.

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$srcPath = Join-Path $root 'branding\symbol image.png'
$resDir = Join-Path $root 'android\app\src\main\res'

# 원본 배경은 순백(#FFF)이 아니라 #FEFEFE다. 채움색을 원본과 같게 맞추면 심볼 크롭의
# 사각 경계가 배경과 이음매 없이 붙는다(알파 추출 없이 해결되는 부분).
$BG = [System.Drawing.Color]::FromArgb(255, 254, 254, 254)

$src = [System.Drawing.Image]::FromFile($srcPath)

# ── 1. 심볼 경계상자 찾기 ────────────────────────────────────────────────────
# 2048px를 GetPixel로 훑으면 느리므로 256px로 줄여서 찾고 원본 좌표로 되돌린다.
$N = 256
$probe = New-Object System.Drawing.Bitmap $N, $N
$pg = [System.Drawing.Graphics]::FromImage($probe)
$pg.InterpolationMode = 'HighQualityBicubic'
$pg.DrawImage($src, 0, 0, $N, $N)
$pg.Dispose()

$bg = $probe.GetPixel(2, 2)
$scanMaxY = 220   # 심볼 끝(206행)과 캡션 시작(234행) 사이의 빈 띠
$minX = $N; $minY = $N; $maxX = 0; $maxY = 0
for ($y = 0; $y -lt $scanMaxY; $y++) {
  for ($x = 0; $x -lt $N; $x++) {
    $p = $probe.GetPixel($x, $y)
    if ($p.A -lt 32) { continue }
    $d = [Math]::Abs($p.R - $bg.R) + [Math]::Abs($p.G - $bg.G) + [Math]::Abs($p.B - $bg.B)
    if ($d -gt 40) {
      if ($x -lt $minX) { $minX = $x }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }
}
$probe.Dispose()

$scale = $src.Width / $N
$pad = 2 * $scale   # 다운샘플 오차(±8px) 보정용 여백
$cropX = [Math]::Max(0, [int]($minX * $scale - $pad))
$cropY = [Math]::Max(0, [int]($minY * $scale - $pad))
$cropW = [Math]::Min($src.Width - $cropX, [int](($maxX - $minX + 1) * $scale + 2 * $pad))
$cropH = [Math]::Min($src.Height - $cropY, [int](($maxY - $minY + 1) * $scale + 2 * $pad))
Write-Host "심볼 크롭: ${cropX},${cropY} ${cropW}x${cropH} (원본 $($src.Width)x$($src.Height))"

$crop = New-Object System.Drawing.Bitmap $cropW, $cropH, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$cg = [System.Drawing.Graphics]::FromImage($crop)
$cg.DrawImage($src, (New-Object System.Drawing.Rectangle 0, 0, $cropW, $cropH),
                    $cropX, $cropY, $cropW, $cropH, [System.Drawing.GraphicsUnit]::Pixel)
$cg.Dispose()
$src.Dispose()

# ── 2. 공통 그리기 헬퍼 ──────────────────────────────────────────────────────
function New-Canvas([int]$w, [int]$h) {
  $bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.SmoothingMode = 'AntiAlias'
  $g.PixelOffsetMode = 'HighQuality'
  $g.CompositingQuality = 'HighQuality'
  return @($bmp, $g)
}

# 심볼을 캔버스 중앙에, 긴 변이 캔버스의 $ratio 가 되도록 그린다(비율 유지).
function Draw-Symbol($g, [int]$w, [int]$h, [double]$ratio) {
  $box = [Math]::Min($w, $h) * $ratio
  $s = [Math]::Min($box / $crop.Width, $box / $crop.Height)
  $dw = $crop.Width * $s
  $dh = $crop.Height * $s
  $g.DrawImage($crop, [float](($w - $dw) / 2), [float](($h - $dh) / 2), [float]$dw, [float]$dh)
}

function Save-Png($bmp, [string]$relPath) {
  $full = Join-Path $resDir $relPath
  $dir = Split-Path -Parent $full
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force $dir | Out-Null }
  $bmp.Save($full, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

# ── 3. 적응형 아이콘 전경(108dp) ─────────────────────────────────────────────
# 런처가 마스크(원/스퀘어클/물방울…)를 씌우므로 내용은 안쪽 72dp = 캔버스의 66% 안에
# 들어와야 한다. 그 밖은 잘려도 되는 여백이라 배경색으로 채운다.
$fg = @{ 'mdpi' = 108; 'hdpi' = 162; 'xhdpi' = 216; 'xxhdpi' = 324; 'xxxhdpi' = 432 }
foreach ($d in $fg.Keys) {
  $n = $fg[$d]
  $c = New-Canvas $n $n
  $c[1].Clear($BG)
  Draw-Symbol $c[1] $n $n 0.62
  $c[1].Dispose()
  Save-Png $c[0] "mipmap-$d\ic_launcher_foreground.png"
}

# ── 4. 레거시 아이콘(48dp, API 25 이하) ──────────────────────────────────────
# 적응형이 없는 기기에는 마스크가 없다. 사각 흰 판은 촌스러우니 둥근 사각(반경 22%)으로
# 직접 깎고, 그 클립 안에서만 심볼을 그린다 — 크롭이 불투명 흰 배경을 갖고 있어서
# 클립 없이 그리면 모서리 밖으로 흰 사각이 삐져나온다.
$lg = @{ 'mdpi' = 48; 'hdpi' = 72; 'xhdpi' = 96; 'xxhdpi' = 144; 'xxxhdpi' = 192 }
foreach ($d in $lg.Keys) {
  $n = $lg[$d]

  # 둥근 사각
  $c = New-Canvas $n $n
  $g = $c[1]
  $g.Clear([System.Drawing.Color]::Transparent)
  $r = [float]($n * 0.22)
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddArc(0, 0, 2 * $r, 2 * $r, 180, 90)
  $path.AddArc($n - 2 * $r, 0, 2 * $r, 2 * $r, 270, 90)
  $path.AddArc($n - 2 * $r, $n - 2 * $r, 2 * $r, 2 * $r, 0, 90)
  $path.AddArc(0, $n - 2 * $r, 2 * $r, 2 * $r, 90, 90)
  $path.CloseFigure()
  $g.SetClip($path)
  $g.Clear($BG)
  Draw-Symbol $g $n $n 0.74
  $path.Dispose(); $g.Dispose()
  Save-Png $c[0] "mipmap-$d\ic_launcher.png"

  # 원형
  $c = New-Canvas $n $n
  $g = $c[1]
  $g.Clear([System.Drawing.Color]::Transparent)
  $circle = New-Object System.Drawing.Drawing2D.GraphicsPath
  $circle.AddEllipse(0, 0, $n, $n)
  $g.SetClip($circle)
  $g.Clear($BG)
  Draw-Symbol $g $n $n 0.68
  $circle.Dispose(); $g.Dispose()
  Save-Png $c[0] "mipmap-$d\ic_launcher_round.png"
}

# ── 5. 스플래시 ──────────────────────────────────────────────────────────────
# styles.xml이 @drawable/splash를 창 배경으로 그대로 쓰므로 화면비에 맞춰 늘어난다.
# 그래서 Capacitor 기본값처럼 방향·밀도별 파일을 두고, **기존과 똑같은 픽셀 크기**로
# 다시 만든다(크기를 바꾸면 늘어나는 정도가 달라진다).
# 서버 URL 방식이라 콜드 스타트가 네트워크를 기다린다 — 이 화면이 생각보다 오래 보인다.
$splash = @(
  @('drawable\splash.png', 480, 320),
  @('drawable-land-mdpi\splash.png', 480, 320),
  @('drawable-land-hdpi\splash.png', 800, 480),
  @('drawable-land-xhdpi\splash.png', 1280, 720),
  @('drawable-land-xxhdpi\splash.png', 1600, 960),
  @('drawable-land-xxxhdpi\splash.png', 1920, 1280),
  @('drawable-port-mdpi\splash.png', 320, 480),
  @('drawable-port-hdpi\splash.png', 480, 800),
  @('drawable-port-xhdpi\splash.png', 720, 1280),
  @('drawable-port-xxhdpi\splash.png', 960, 1600),
  @('drawable-port-xxxhdpi\splash.png', 1280, 1920)
)
foreach ($s in $splash) {
  $c = New-Canvas $s[1] $s[2]
  $c[1].Clear($BG)
  Draw-Symbol $c[1] $s[1] $s[2] 0.30
  $c[1].Dispose()
  Save-Png $c[0] $s[0]
}

$crop.Dispose()
Write-Host "완료: 런처 아이콘 15개 + 스플래시 11개"
