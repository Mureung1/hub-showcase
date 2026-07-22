param(
  [string]$Root = (Resolve-Path ".").Path,
  [string]$PetId = "",
  [switch]$ReviewOnly
)

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"

$frameSize = 64
$keyTolerance = 42
$sourceStageIndex = 0

$pets = @(
  @{ Id = "pink-manager"; Source = "public/assets/lumi/character-2-pink-animal-cute-samesize-stage-1-4-v5-chromakey.png"; MaxSize = 58; Bottom = 61 },
  @{ Id = "white-headed-long-tailed-tit"; Source = "public/assets/lumi/candidate-white-headed-long-tailed-tit-stage-1-4-v2-chromakey.png"; MaxSize = 46; Bottom = 57 },
  @{ Id = "costasiella-kuroshimae"; Source = "public/assets/lumi/candidate-costasiella-kuroshimae-stage-1-4-v2-chromakey.png"; MaxSize = 46; Bottom = 58; MinComponentArea = 9; RemoveComponentsMinX = 48 },
  @{ Id = "sea-bunny-slug"; Source = "public/assets/lumi/candidate-sea-bunny-slug-stage-1-4-v2-chromakey.png"; MaxSize = 46; Bottom = 58 },
  @{ Id = "platypus"; Source = "public/assets/lumi/candidate-platypus-stage-1-4-v2-chromakey.png"; MaxSize = 48; Bottom = 58 },
  @{ Id = "axolotl"; Source = "public/assets/lumi/candidate-axolotl-stage-1-4-v2-chromakey.png"; MaxSize = 48; Bottom = 58 },
  @{ Id = "glass-frog"; Source = "public/assets/lumi/candidate-glass-frog-stage-1-4-v2-chromakey.png"; MaxSize = 46; Bottom = 58 },
  @{ Id = "fried-egg-jellyfish"; Source = "public/assets/lumi/candidate-fried-egg-jellyfish-stage-1-4-v2-chromakey.png"; MaxSize = 48; Bottom = 58 },
  @{ Id = "yeti-crab"; Source = "public/assets/lumi/candidate-yeti-crab-stage-1-4-v2-chromakey.png"; MaxSize = 50; Bottom = 58 }
)

$motionSpecs = @(
  @{ State = "idle"; FrameCount = 4 },
  @{ State = "focused"; FrameCount = 4 },
  @{ State = "happy"; FrameCount = 6 },
  @{ State = "recovering"; FrameCount = 4 },
  @{ State = "hanging"; FrameCount = 6 },
  @{ State = "hiding"; FrameCount = 6 },
  @{ State = "run"; FrameCount = 6 },
  @{ State = "jump"; FrameCount = 6 },
  @{ State = "walk"; FrameCount = 6 },
  @{ State = "climbing"; FrameCount = 6 }
)

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

function Test-IsKeyPixel([System.Drawing.Color]$Color) {
  return ($Color.G -gt 180 -and $Color.R -lt 90 -and $Color.B -lt 90)
}

function Export-StageBase($Pet) {
  $sourcePath = Join-Path $Root $Pet.Source
  $source = [System.Drawing.Bitmap]::FromFile($sourcePath)

  try {
    $segmentWidth = [Math]::Floor($source.Width / 4)
    $segmentX = $sourceStageIndex * $segmentWidth
    $minX = $segmentWidth
    $minY = $source.Height
    $maxX = 0
    $maxY = 0

    for ($y = 0; $y -lt $source.Height; $y++) {
      for ($x = 0; $x -lt $segmentWidth; $x++) {
        $color = $source.GetPixel($segmentX + $x, $y)
        if (-not (Test-IsKeyPixel $color) -and $color.A -gt 8) {
          if ($x -lt $minX) { $minX = $x }
          if ($y -lt $minY) { $minY = $y }
          if ($x -gt $maxX) { $maxX = $x }
          if ($y -gt $maxY) { $maxY = $y }
        }
      }
    }

    if ($maxX -le $minX -or $maxY -le $minY) {
      throw "No non-key pixels found in $($Pet.Source)"
    }

    $trimWidth = $maxX - $minX + 1
    $trimHeight = $maxY - $minY + 1
    $scale = [Math]::Min($Pet.MaxSize / $trimWidth, $Pet.MaxSize / $trimHeight)
    $destWidth = [Math]::Max(1, [Math]::Round($trimWidth * $scale))
    $destHeight = [Math]::Max(1, [Math]::Round($trimHeight * $scale))
    $destX = [Math]::Round(($frameSize - $destWidth) / 2)
    $destY = $Pet.Bottom - $destHeight

    $base = New-TransparentBitmap $frameSize $frameSize
    $graphics = [System.Drawing.Graphics]::FromImage($base)
    try {
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
      $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
      $destRect = New-Object System.Drawing.Rectangle $destX, $destY, $destWidth, $destHeight
      $srcRect = New-Object System.Drawing.Rectangle ($segmentX + $minX), $minY, $trimWidth, $trimHeight
      $graphics.DrawImage($source, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    } finally {
      $graphics.Dispose()
    }

    for ($y = 0; $y -lt $frameSize; $y++) {
      for ($x = 0; $x -lt $frameSize; $x++) {
        $color = $base.GetPixel($x, $y)
        if (Test-IsKeyPixel $color) {
          $base.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
        } elseif ($color.A -gt 0) {
          $base.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($color.A, $color.R, $color.G, $color.B))
        }
      }
    }

    $minComponentArea = if ($Pet.ContainsKey("MinComponentArea")) { [int]$Pet.MinComponentArea } else { 0 }
    if ($minComponentArea -gt 0) {
      Remove-SmallComponents $base $minComponentArea
    }
    if ($Pet.ContainsKey("RemoveComponentsMinX")) {
      Remove-ComponentsStartingAfterX $base ([int]$Pet.RemoveComponentsMinX)
    }

    return $base
  } finally {
    $source.Dispose()
  }
}

function Remove-ComponentsStartingAfterX($Bitmap, [int]$MinXThreshold) {
  $visited = New-Object 'bool[,]' $Bitmap.Width, $Bitmap.Height

  for ($y = 0; $y -lt $Bitmap.Height; $y++) {
    for ($x = 0; $x -lt $Bitmap.Width; $x++) {
      if ($visited[$x, $y]) { continue }

      $visited[$x, $y] = $true
      $color = $Bitmap.GetPixel($x, $y)
      if ($color.A -le 16) { continue }

      $queue = New-Object System.Collections.Generic.Queue[object]
      $points = New-Object System.Collections.Generic.List[object]
      $queue.Enqueue(@($x, $y))
      $componentMinX = $x

      while ($queue.Count -gt 0) {
        $point = $queue.Dequeue()
        $px = [int]$point[0]
        $py = [int]$point[1]
        $points.Add(@($px, $py))
        if ($px -lt $componentMinX) { $componentMinX = $px }

        foreach ($delta in @(@(1, 0), @(-1, 0), @(0, 1), @(0, -1))) {
          $nx = $px + $delta[0]
          $ny = $py + $delta[1]

          if ($nx -lt 0 -or $ny -lt 0 -or $nx -ge $Bitmap.Width -or $ny -ge $Bitmap.Height) { continue }
          if ($visited[$nx, $ny]) { continue }

          $visited[$nx, $ny] = $true
          $neighbor = $Bitmap.GetPixel($nx, $ny)
          if ($neighbor.A -gt 16) {
            $queue.Enqueue(@($nx, $ny))
          }
        }
      }

      if ($componentMinX -ge $MinXThreshold) {
        foreach ($point in $points) {
          $Bitmap.SetPixel([int]$point[0], [int]$point[1], [System.Drawing.Color]::Transparent)
        }
      }
    }
  }
}

function Remove-SmallComponents($Bitmap, [int]$MinArea) {
  $visited = New-Object 'bool[,]' $Bitmap.Width, $Bitmap.Height

  for ($y = 0; $y -lt $Bitmap.Height; $y++) {
    for ($x = 0; $x -lt $Bitmap.Width; $x++) {
      if ($visited[$x, $y]) { continue }

      $visited[$x, $y] = $true
      $color = $Bitmap.GetPixel($x, $y)
      if ($color.A -le 16) { continue }

      $queue = New-Object System.Collections.Generic.Queue[object]
      $points = New-Object System.Collections.Generic.List[object]
      $queue.Enqueue(@($x, $y))

      while ($queue.Count -gt 0) {
        $point = $queue.Dequeue()
        $px = [int]$point[0]
        $py = [int]$point[1]
        $points.Add(@($px, $py))

        foreach ($delta in @(@(1, 0), @(-1, 0), @(0, 1), @(0, -1))) {
          $nx = $px + $delta[0]
          $ny = $py + $delta[1]

          if ($nx -lt 0 -or $ny -lt 0 -or $nx -ge $Bitmap.Width -or $ny -ge $Bitmap.Height) { continue }
          if ($visited[$nx, $ny]) { continue }

          $visited[$nx, $ny] = $true
          $neighbor = $Bitmap.GetPixel($nx, $ny)
          if ($neighbor.A -gt 16) {
            $queue.Enqueue(@($nx, $ny))
          }
        }
      }

      if ($points.Count -lt $MinArea) {
        foreach ($point in $points) {
          $Bitmap.SetPixel([int]$point[0], [int]$point[1], [System.Drawing.Color]::Transparent)
        }
      }
    }
  }
}

function Get-FrameTransforms([string]$State) {
  switch ($State) {
    "idle" {
      return @(
        @{ Dx = 0; Dy = 0; Sx = 1.00; Sy = 1.00; Rotate = 0; Mirror = $false },
        @{ Dx = 0; Dy = -1; Sx = 1.00; Sy = 1.00; Rotate = 0; Mirror = $false },
        @{ Dx = 0; Dy = 0; Sx = 1.00; Sy = 1.00; Rotate = 0; Mirror = $false },
        @{ Dx = 0; Dy = 1; Sx = 1.00; Sy = 1.00; Rotate = 0; Mirror = $false }
      )
    }
    "focused" {
      return @(
        @{ Dx = 0; Dy = 0; Sx = 1.00; Sy = 1.00; Rotate = 0; Mirror = $false },
        @{ Dx = 1; Dy = 0; Sx = 1.00; Sy = 1.00; Rotate = 1; Mirror = $false },
        @{ Dx = 0; Dy = 0; Sx = 1.00; Sy = 1.00; Rotate = 0; Mirror = $false },
        @{ Dx = -1; Dy = 0; Sx = 1.00; Sy = 1.00; Rotate = -1; Mirror = $false }
      )
    }
    "happy" {
      return @(
        @{ Dx = 0; Dy = 0; Sx = 1.00; Sy = 1.00; Rotate = 0; Mirror = $false },
        @{ Dx = 0; Dy = -3; Sx = 1.02; Sy = 0.98; Rotate = -2; Mirror = $false },
        @{ Dx = 0; Dy = -5; Sx = 1.00; Sy = 1.00; Rotate = 0; Mirror = $false },
        @{ Dx = 0; Dy = -3; Sx = 1.02; Sy = 0.98; Rotate = 2; Mirror = $true },
        @{ Dx = 0; Dy = 0; Sx = 1.00; Sy = 1.00; Rotate = 0; Mirror = $false },
        @{ Dx = 0; Dy = 1; Sx = 1.04; Sy = 0.96; Rotate = 0; Mirror = $false }
      )
    }
    "recovering" {
      return @(
        @{ Dx = 0; Dy = 1; Sx = 1.02; Sy = 0.98; Rotate = -2; Mirror = $false },
        @{ Dx = -1; Dy = 1; Sx = 1.00; Sy = 1.00; Rotate = -1; Mirror = $false },
        @{ Dx = 0; Dy = 0; Sx = 1.00; Sy = 1.00; Rotate = 0; Mirror = $false },
        @{ Dx = 1; Dy = 1; Sx = 1.00; Sy = 1.00; Rotate = 1; Mirror = $false }
      )
    }
    "hanging" {
      return @(
        @{ Dx = 0; Dy = -10; Sx = 1.00; Sy = 1.00; Rotate = -3; Mirror = $false },
        @{ Dx = -1; Dy = -11; Sx = 1.00; Sy = 1.00; Rotate = -2; Mirror = $false },
        @{ Dx = 0; Dy = -10; Sx = 1.00; Sy = 1.00; Rotate = 0; Mirror = $false },
        @{ Dx = 1; Dy = -11; Sx = 1.00; Sy = 1.00; Rotate = 2; Mirror = $false },
        @{ Dx = 0; Dy = -10; Sx = 1.00; Sy = 1.00; Rotate = 3; Mirror = $false },
        @{ Dx = 0; Dy = -9; Sx = 1.02; Sy = 0.98; Rotate = 0; Mirror = $false }
      )
    }
    "hiding" {
      return @(
        @{ Dx = -19; Dy = 0; Sx = 1.00; Sy = 1.00; Rotate = 0; Mirror = $false },
        @{ Dx = -15; Dy = 0; Sx = 1.00; Sy = 1.00; Rotate = 0; Mirror = $false },
        @{ Dx = -12; Dy = -1; Sx = 1.00; Sy = 1.00; Rotate = 1; Mirror = $false },
        @{ Dx = -15; Dy = 0; Sx = 1.00; Sy = 1.00; Rotate = 0; Mirror = $false },
        @{ Dx = -19; Dy = 1; Sx = 1.00; Sy = 1.00; Rotate = -1; Mirror = $false },
        @{ Dx = -22; Dy = 0; Sx = 1.00; Sy = 1.00; Rotate = 0; Mirror = $false }
      )
    }
    "run" {
      return @(
        @{ Dx = -2; Dy = 0; Sx = 1.02; Sy = 0.98; Rotate = -3; Mirror = $false },
        @{ Dx = 1; Dy = -2; Sx = 0.98; Sy = 1.02; Rotate = 2; Mirror = $true },
        @{ Dx = 3; Dy = 0; Sx = 1.02; Sy = 0.98; Rotate = 3; Mirror = $false },
        @{ Dx = 0; Dy = -1; Sx = 1.00; Sy = 1.00; Rotate = -2; Mirror = $true },
        @{ Dx = -3; Dy = 0; Sx = 1.02; Sy = 0.98; Rotate = -3; Mirror = $false },
        @{ Dx = 0; Dy = -2; Sx = 0.98; Sy = 1.02; Rotate = 2; Mirror = $true }
      )
    }
    "jump" {
      return @(
        @{ Dx = 0; Dy = 1; Sx = 1.08; Sy = 0.92; Rotate = 0; Mirror = $false },
        @{ Dx = 0; Dy = -3; Sx = 0.98; Sy = 1.04; Rotate = -2; Mirror = $false },
        @{ Dx = 0; Dy = -8; Sx = 1.00; Sy = 1.00; Rotate = 0; Mirror = $false },
        @{ Dx = 0; Dy = -6; Sx = 1.00; Sy = 1.00; Rotate = 2; Mirror = $true },
        @{ Dx = 0; Dy = -2; Sx = 1.00; Sy = 1.00; Rotate = 0; Mirror = $false },
        @{ Dx = 0; Dy = 1; Sx = 1.06; Sy = 0.94; Rotate = 0; Mirror = $false }
      )
    }
    "walk" {
      return @(
        @{ Dx = 0; Dy = 0; Sx = 1.00; Sy = 1.00; Rotate = 0; Mirror = $false },
        @{ Dx = -1; Dy = -1; Sx = 1.00; Sy = 1.00; Rotate = -2; Mirror = $false },
        @{ Dx = 0; Dy = 0; Sx = 1.00; Sy = 1.00; Rotate = 0; Mirror = $true },
        @{ Dx = 1; Dy = -1; Sx = 1.00; Sy = 1.00; Rotate = 2; Mirror = $true },
        @{ Dx = 0; Dy = 0; Sx = 1.00; Sy = 1.00; Rotate = 0; Mirror = $false },
        @{ Dx = 0; Dy = 1; Sx = 1.02; Sy = 0.98; Rotate = 0; Mirror = $false }
      )
    }
    "climbing" {
      return @(
        @{ Dx = -1; Dy = 1; Sx = 1.00; Sy = 1.00; Rotate = -2; Mirror = $false },
        @{ Dx = 1; Dy = -2; Sx = 1.00; Sy = 1.00; Rotate = 2; Mirror = $true },
        @{ Dx = -1; Dy = -4; Sx = 1.00; Sy = 1.00; Rotate = -2; Mirror = $false },
        @{ Dx = 1; Dy = -6; Sx = 1.00; Sy = 1.00; Rotate = 2; Mirror = $true },
        @{ Dx = -1; Dy = -4; Sx = 1.00; Sy = 1.00; Rotate = -1; Mirror = $false },
        @{ Dx = 0; Dy = -2; Sx = 1.00; Sy = 1.00; Rotate = 0; Mirror = $false }
      )
    }
  }
}

function New-TransformedFrame($Base, $Transform) {
  $frame = New-TransparentBitmap $frameSize $frameSize
  $graphics = [System.Drawing.Graphics]::FromImage($frame)
  try {
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
    $graphics.TranslateTransform(32 + $Transform.Dx, 32 + $Transform.Dy)
    $graphics.RotateTransform($Transform.Rotate)
    $scaleX = if ($Transform.Mirror) { -1 * $Transform.Sx } else { $Transform.Sx }
    $graphics.ScaleTransform($scaleX, $Transform.Sy)
    $graphics.DrawImage($Base, -32, -32, $frameSize, $frameSize)
  } finally {
    $graphics.Dispose()
  }
  return $frame
}

function Export-MotionSheet($Pet, $Base, $Motion) {
  $frames = Get-FrameTransforms $Motion.State
  if ($frames.Count -ne $Motion.FrameCount) {
    throw "$($Motion.State) expected $($Motion.FrameCount) transforms but got $($frames.Count)"
  }

  $sheet = New-TransparentBitmap ($Motion.FrameCount * $frameSize) $frameSize
  $graphics = [System.Drawing.Graphics]::FromImage($sheet)
  try {
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half

    for ($i = 0; $i -lt $Motion.FrameCount; $i++) {
      $frame = New-TransformedFrame $Base $frames[$i]
      try {
        $graphics.DrawImage($frame, $i * $frameSize, 0, $frameSize, $frameSize)
      } finally {
        $frame.Dispose()
      }
    }

    $outputDir = Join-Path $Root "public/assets/lumi/$($Pet.Id)-stage-1"
    New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
    $outputPath = Join-Path $outputDir "$($Pet.Id)-stage-1-$($Motion.State)-sheet.png"
    $sheet.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $graphics.Dispose()
    $sheet.Dispose()
  }
}

function Export-ReviewContact($PetIds, [string]$OutputName) {
  $cellWidth = 384
  $rowHeight = 64
  $labelWidth = 190
  $motionLabelWidth = 88
  $width = $labelWidth + $motionLabelWidth + $cellWidth
  $height = ($PetIds.Count * $motionSpecs.Count * $rowHeight)
  $contact = New-Object System.Drawing.Bitmap $width, $height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($contact)
  try {
    $graphics.Clear([System.Drawing.Color]::FromArgb(255, 236, 233, 216))
    $font = New-Object System.Drawing.Font "Consolas", 9
    $brush = [System.Drawing.Brushes]::Black
    $y = 0
    foreach ($petId in $PetIds) {
      foreach ($motion in $motionSpecs) {
        $path = Join-Path $Root "public/assets/lumi/$petId-stage-1/$petId-stage-1-$($motion.State)-sheet.png"
        $sheet = [System.Drawing.Bitmap]::FromFile($path)
        try {
          $graphics.DrawString($petId, $font, $brush, 6, $y + 6)
          $graphics.DrawString($motion.State, $font, $brush, $labelWidth + 6, $y + 6)
          $graphics.DrawImage($sheet, $labelWidth + $motionLabelWidth, $y, $sheet.Width, $sheet.Height)
          $graphics.DrawRectangle([System.Drawing.Pens]::DarkGray, 0, $y, $width - 1, $rowHeight - 1)
        } finally {
          $sheet.Dispose()
        }
        $y += $rowHeight
      }
    }
    $reviewDir = Join-Path $Root "public/assets/_review"
    New-Item -ItemType Directory -Force -Path $reviewDir | Out-Null
    $contact.Save((Join-Path $reviewDir $OutputName), [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $graphics.Dispose()
    $contact.Dispose()
  }
}

$baseDir = Join-Path $Root "public/assets/lumi/animation-bases"
New-Item -ItemType Directory -Force -Path $baseDir | Out-Null

$selectedPets = @(if ([string]::IsNullOrWhiteSpace($PetId)) {
  $pets
} else {
  $pets | Where-Object { $_.Id -eq $PetId }
})

if ($selectedPets.Count -eq 0) {
  throw "Unknown PetId '$PetId'"
}

$generatedPetIds = New-Object System.Collections.Generic.List[string]

foreach ($pet in $selectedPets) {
  if (-not $ReviewOnly) {
    $base = Export-StageBase $pet
    try {
      $basePath = Join-Path $baseDir "$($pet.Id)-stage-1-base-reference.png"
      $base.Save($basePath, [System.Drawing.Imaging.ImageFormat]::Png)

      foreach ($motion in $motionSpecs) {
        Export-MotionSheet $pet $base $motion
      }
    } finally {
      $base.Dispose()
    }
  }
  $generatedPetIds.Add($pet.Id)
}

$contactName = if ([string]::IsNullOrWhiteSpace($PetId)) {
  "stage-1-pet-motion-sheets-contact.png"
} else {
  "stage-1-pet-motion-sheets-$PetId-contact.png"
}

Export-ReviewContact $generatedPetIds $contactName

if ($ReviewOnly) {
  Write-Host "Generated review contact for $($generatedPetIds.Count) Stage 1 pet motion sets."
} else {
  Write-Host "Generated $($generatedPetIds.Count) Stage 1 pet motion sets."
}
