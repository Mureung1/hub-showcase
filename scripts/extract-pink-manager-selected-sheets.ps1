param(
  [string]$Root = (Resolve-Path ".").Path
)

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"
$frameSize = 64

$boardPath = Join-Path $Root "public/assets/_review/pink-manager-motion-board-v3-refined-from-call-pj.png"
$jumpPath = Join-Path $Root "public/assets/_review/pink-manager-jump-v2-right-facing.png"
$outputDir = Join-Path $Root "public/assets/lumi/pink-manager-stage-1-v2"
$reviewPath = Join-Path $Root "public/assets/_review/pink-manager-stage-1-v2-contact.png"

$boardRows = @(
  @{ State = "idle"; FrameCount = 4; Y = 20; Height = 94; MaxSize = 58 },
  @{ State = "focused"; FrameCount = 4; Y = 124; Height = 94; MaxSize = 58 },
  @{ State = "happy"; FrameCount = 6; Y = 228; Height = 94; MaxSize = 58 },
  @{ State = "recovering"; FrameCount = 4; Y = 333; Height = 94; MaxSize = 58 },
  @{ State = "hanging"; FrameCount = 6; Y = 438; Height = 82; MaxSize = 58 },
  @{ State = "hiding"; FrameCount = 6; Y = 530; Height = 96; MaxSize = 58 },
  @{ State = "run"; FrameCount = 6; Y = 630; Height = 94; MaxSize = 58 },
  @{ State = "jump"; FrameCount = 6; Y = 0; Height = 0; MaxSize = 58; Source = "jump" },
  @{ State = "walk"; FrameCount = 6; Y = 830; Height = 94; MaxSize = 58 },
  @{ State = "climbing"; FrameCount = 6; Y = 928; Height = 94; MaxSize = 58 }
)

function Test-IsGreen([System.Drawing.Color]$Color) {
  return ($Color.G -gt 150 -and $Color.R -lt 105 -and $Color.B -lt 105)
}

function New-TransparentBitmap([int]$Width, [int]$Height) {
  $bitmap = New-Object System.Drawing.Bitmap $Width, $Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.Clear([System.Drawing.Color]::Transparent)
  } finally {
    $graphics.Dispose()
  }
  return $bitmap
}

function Get-Components($Bitmap, [int]$MinArea) {
  $visited = New-Object 'bool[,]' $Bitmap.Width, $Bitmap.Height
  $components = New-Object System.Collections.Generic.List[object]

  for ($y = 0; $y -lt $Bitmap.Height; $y++) {
    for ($x = 0; $x -lt $Bitmap.Width; $x++) {
      if ($visited[$x, $y]) { continue }
      $visited[$x, $y] = $true

      $color = $Bitmap.GetPixel($x, $y)
      if (Test-IsGreen $color) { continue }

      $queue = New-Object System.Collections.Generic.Queue[object]
      $queue.Enqueue(@($x, $y))
      $area = 0
      $minX = $x
      $maxX = $x
      $minY = $y
      $maxY = $y

      while ($queue.Count -gt 0) {
        $point = $queue.Dequeue()
        $px = [int]$point[0]
        $py = [int]$point[1]
        $area += 1
        if ($px -lt $minX) { $minX = $px }
        if ($px -gt $maxX) { $maxX = $px }
        if ($py -lt $minY) { $minY = $py }
        if ($py -gt $maxY) { $maxY = $py }

        foreach ($delta in @(@(1, 0), @(-1, 0), @(0, 1), @(0, -1))) {
          $nx = $px + $delta[0]
          $ny = $py + $delta[1]
          if ($nx -lt 0 -or $ny -lt 0 -or $nx -ge $Bitmap.Width -or $ny -ge $Bitmap.Height) { continue }
          if ($visited[$nx, $ny]) { continue }

          $visited[$nx, $ny] = $true
          $neighbor = $Bitmap.GetPixel($nx, $ny)
          if (-not (Test-IsGreen $neighbor)) {
            $queue.Enqueue(@($nx, $ny))
          }
        }
      }

      if ($area -ge $MinArea) {
        $components.Add([pscustomobject]@{
          Area = $area
          MinX = $minX
          MaxX = $maxX
          MinY = $minY
          MaxY = $maxY
          CenterX = ($minX + $maxX) / 2
          CenterY = ($minY + $maxY) / 2
        })
      }
    }
  }

  return @($components | Sort-Object CenterX)
}

function Convert-ComponentToFrame($Bitmap, $Component, [int]$MaxSize) {
  $padding = 8
  $cropX = [Math]::Max(0, $Component.MinX - $padding)
  $cropY = [Math]::Max(0, $Component.MinY - $padding)
  $cropRight = [Math]::Min($Bitmap.Width - 1, $Component.MaxX + $padding)
  $cropBottom = [Math]::Min($Bitmap.Height - 1, $Component.MaxY + $padding)
  $cropWidth = $cropRight - $cropX + 1
  $cropHeight = $cropBottom - $cropY + 1

  $scale = [Math]::Min($MaxSize / $cropWidth, $MaxSize / $cropHeight)
  $destWidth = [Math]::Max(1, [Math]::Round($cropWidth * $scale))
  $destHeight = [Math]::Max(1, [Math]::Round($cropHeight * $scale))
  $destX = [Math]::Round(($frameSize - $destWidth) / 2)
  $destY = [Math]::Round(($frameSize - $destHeight) / 2)

  $frame = New-TransparentBitmap $frameSize $frameSize
  $graphics = [System.Drawing.Graphics]::FromImage($frame)
  try {
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
    $sourceRect = New-Object System.Drawing.Rectangle $cropX, $cropY, $cropWidth, $cropHeight
    $destRect = New-Object System.Drawing.Rectangle $destX, $destY, $destWidth, $destHeight
    $graphics.DrawImage($Bitmap, $destRect, $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
  } finally {
    $graphics.Dispose()
  }

  for ($y = 0; $y -lt $frame.Height; $y++) {
    for ($x = 0; $x -lt $frame.Width; $x++) {
      $color = $frame.GetPixel($x, $y)
      if (Test-IsGreen $color) {
        $frame.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
      }
    }
  }

  return $frame
}

function Export-SheetFromBitmap($Bitmap, $Spec, [int]$MinArea) {
  $components = @(Get-Components $Bitmap $MinArea | Select-Object -First $Spec.FrameCount)
  if ($components.Count -lt $Spec.FrameCount) {
    throw "$($Spec.State) expected $($Spec.FrameCount) frames but found $($components.Count)."
  }

  $sheet = New-TransparentBitmap ($Spec.FrameCount * $frameSize) $frameSize
  $graphics = [System.Drawing.Graphics]::FromImage($sheet)
  try {
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
    for ($i = 0; $i -lt $Spec.FrameCount; $i++) {
      $frame = Convert-ComponentToFrame $Bitmap $components[$i] $Spec.MaxSize
      try {
        $graphics.DrawImage($frame, $i * $frameSize, 0, $frameSize, $frameSize)
      } finally {
        $frame.Dispose()
      }
    }

    $sheet.Save((Join-Path $outputDir "pink-manager-stage-1-$($Spec.State)-sheet.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $graphics.Dispose()
    $sheet.Dispose()
  }
}

function Get-DownscaledBitmap($Bitmap, [int]$MaxWidth) {
  if ($Bitmap.Width -le $MaxWidth) {
    return $Bitmap.Clone()
  }

  $scale = $MaxWidth / $Bitmap.Width
  $targetWidth = [Math]::Round($Bitmap.Width * $scale)
  $targetHeight = [Math]::Round($Bitmap.Height * $scale)
  $scaled = New-Object System.Drawing.Bitmap $targetWidth, $targetHeight, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($scaled)
  try {
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
    $graphics.DrawImage($Bitmap, 0, 0, $targetWidth, $targetHeight)
  } finally {
    $graphics.Dispose()
  }
  return $scaled
}

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$board = [System.Drawing.Bitmap]::FromFile($boardPath)
$jump = [System.Drawing.Bitmap]::FromFile($jumpPath)

try {
  $scaledJump = Get-DownscaledBitmap $jump 1200
  foreach ($spec in $boardRows) {
    if ($spec.Source -eq "jump") {
      Export-SheetFromBitmap $scaledJump $spec 420
      continue
    }

    $rowBitmap = New-Object System.Drawing.Bitmap $board.Width, $spec.Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($rowBitmap)
    try {
      $graphics.DrawImage($board, (New-Object System.Drawing.Rectangle 0, 0, $board.Width, $spec.Height), (New-Object System.Drawing.Rectangle 0, $spec.Y, $board.Width, $spec.Height), [System.Drawing.GraphicsUnit]::Pixel)
    } finally {
      $graphics.Dispose()
    }

    try {
      $scaledRow = Get-DownscaledBitmap $rowBitmap 900
      try {
        Export-SheetFromBitmap $scaledRow $spec 420
      } finally {
        $scaledRow.Dispose()
      }
    } finally {
      $rowBitmap.Dispose()
    }
  }
} finally {
  if ($scaledJump) { $scaledJump.Dispose() }
  $board.Dispose()
  $jump.Dispose()
}

$contactWidth = 190 + 88 + 384
$contactHeight = $boardRows.Count * 64
$contact = New-Object System.Drawing.Bitmap $contactWidth, $contactHeight, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$contactGraphics = [System.Drawing.Graphics]::FromImage($contact)
try {
  $contactGraphics.Clear([System.Drawing.Color]::FromArgb(255, 236, 233, 216))
  $font = New-Object System.Drawing.Font "Consolas", 9
  $y = 0
  foreach ($spec in $boardRows) {
    $sheetPath = Join-Path $outputDir "pink-manager-stage-1-$($spec.State)-sheet.png"
    $sheet = [System.Drawing.Bitmap]::FromFile($sheetPath)
    try {
      $contactGraphics.DrawString("pink-manager", $font, [System.Drawing.Brushes]::Black, 6, $y + 6)
      $contactGraphics.DrawString($spec.State, $font, [System.Drawing.Brushes]::Black, 196, $y + 6)
      $contactGraphics.DrawImage($sheet, 278, $y, $sheet.Width, $sheet.Height)
      $contactGraphics.DrawRectangle([System.Drawing.Pens]::DarkGray, 0, $y, $contactWidth - 1, 63)
    } finally {
      $sheet.Dispose()
    }
    $y += 64
  }
  $contact.Save($reviewPath, [System.Drawing.Imaging.ImageFormat]::Png)
} finally {
  $contactGraphics.Dispose()
  $contact.Dispose()
}

Write-Host "Extracted selected pink-manager sheets to public/assets/lumi/pink-manager-stage-1-v2."
