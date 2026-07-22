param(
  [string]$Root = (Resolve-Path ".").Path,
  [string]$Source = "public/assets/_review/pink-manager-motion-board-v2.png",
  [switch]$DebugRows
)

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"
$frameSize = 64
$minComponentArea = 1400

$motions = @(
  @{ State = "idle"; FrameCount = 4; MaxSize = 58 },
  @{ State = "focused"; FrameCount = 4; MaxSize = 58 },
  @{ State = "happy"; FrameCount = 6; MaxSize = 58 },
  @{ State = "recovering"; FrameCount = 4; MaxSize = 58 },
  @{ State = "hanging"; FrameCount = 6; MaxSize = 58 },
  @{ State = "hiding"; FrameCount = 6; MaxSize = 58 },
  @{ State = "run"; FrameCount = 6; MaxSize = 58 },
  @{ State = "jump"; FrameCount = 6; MaxSize = 58 },
  @{ State = "walk"; FrameCount = 6; MaxSize = 58 },
  @{ State = "climbing"; FrameCount = 6; MaxSize = 58 }
)

function Test-IsGreen([System.Drawing.Color]$Color) {
  return ($Color.G -gt 150 -and $Color.R -lt 100 -and $Color.B -lt 100)
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

function Get-Components($Bitmap) {
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

      if ($area -ge $minComponentArea) {
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

  return @($components | Sort-Object CenterY, CenterX)
}

function Get-Rows($Components) {
  $rows = New-Object System.Collections.Generic.List[object]
  $rowTolerance = 42

  foreach ($component in $Components) {
    $targetRow = $null
    foreach ($row in $rows) {
      if ([Math]::Abs($row.CenterY - $component.CenterY) -le $rowTolerance) {
        $targetRow = $row
        break
      }
    }

    if ($null -eq $targetRow) {
      $targetRow = [pscustomobject]@{
        CenterY = $component.CenterY
        Items = New-Object System.Collections.Generic.List[object]
      }
      $rows.Add($targetRow)
    }

    $targetRow.Items.Add($component)
    $targetRow.CenterY = (($targetRow.CenterY * ($targetRow.Items.Count - 1)) + $component.CenterY) / $targetRow.Items.Count
  }

  return @($rows | Sort-Object CenterY)
}

function Export-Frame($SourceBitmap, $Component, [int]$MaxSize) {
  $padding = 8
  $cropX = [Math]::Max(0, $Component.MinX - $padding)
  $cropY = [Math]::Max(0, $Component.MinY - $padding)
  $cropRight = [Math]::Min($SourceBitmap.Width - 1, $Component.MaxX + $padding)
  $cropBottom = [Math]::Min($SourceBitmap.Height - 1, $Component.MaxY + $padding)
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
    $graphics.DrawImage($SourceBitmap, $destRect, $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
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

$sourcePath = Join-Path $Root $Source
$sourceBitmap = [System.Drawing.Bitmap]::FromFile($sourcePath)

try {
  $components = Get-Components $sourceBitmap
  $rows = Get-Rows $components
  if ($DebugRows) {
    for ($rowIndex = 0; $rowIndex -lt $rows.Count; $rowIndex++) {
      $items = @($rows[$rowIndex].Items | Sort-Object CenterX)
      Write-Host ("row={0} centerY={1:N1} count={2} xs={3}" -f $rowIndex, $rows[$rowIndex].CenterY, $items.Count, (($items | ForEach-Object { [Math]::Round($_.CenterX) }) -join ","))
    }
    exit 0
  }
  if ($rows.Count -lt $motions.Count) {
    throw "Expected at least $($motions.Count) motion rows but found $($rows.Count)."
  }

  $outputDir = Join-Path $Root "public/assets/lumi/pink-manager-stage-1-v2"
  New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

  for ($rowIndex = 0; $rowIndex -lt $motions.Count; $rowIndex++) {
    $motion = $motions[$rowIndex]
    $items = @($rows[$rowIndex].Items | Sort-Object CenterX | Select-Object -First $motion.FrameCount)
    if ($items.Count -lt $motion.FrameCount) {
      throw "$($motion.State) expected $($motion.FrameCount) frames but found $($items.Count)."
    }

    $sheet = New-TransparentBitmap ($motion.FrameCount * $frameSize) $frameSize
    $graphics = [System.Drawing.Graphics]::FromImage($sheet)
    try {
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half

      for ($i = 0; $i -lt $motion.FrameCount; $i++) {
        $frame = Export-Frame $sourceBitmap $items[$i] $motion.MaxSize
        try {
          $graphics.DrawImage($frame, $i * $frameSize, 0, $frameSize, $frameSize)
        } finally {
          $frame.Dispose()
        }
      }

      $sheet.Save((Join-Path $outputDir "pink-manager-stage-1-$($motion.State)-sheet.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $graphics.Dispose()
      $sheet.Dispose()
    }
  }
} finally {
  $sourceBitmap.Dispose()
}

Write-Host "Extracted pink-manager v2 sheets to public/assets/lumi/pink-manager-stage-1-v2."
