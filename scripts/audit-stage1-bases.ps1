param(
  [string]$Root = (Resolve-Path ".").Path
)

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"
$baseDir = Join-Path $Root "public/assets/lumi/animation-bases"
$files = Get-ChildItem $baseDir -Filter "*-stage-1-base-reference.png" |
  Where-Object { $_.Name -ne "planaria-stage-1-base-reference.png" } |
  Sort-Object Name

foreach ($file in $files) {
  $image = [System.Drawing.Bitmap]::FromFile($file.FullName)

  try {
    $minX = $image.Width
    $minY = $image.Height
    $maxX = -1
    $maxY = -1
    $pixelCount = 0
    $visited = New-Object 'bool[,]' $image.Width, $image.Height
    $areas = New-Object System.Collections.Generic.List[int]

    for ($y = 0; $y -lt $image.Height; $y++) {
      for ($x = 0; $x -lt $image.Width; $x++) {
        $color = $image.GetPixel($x, $y)
        if ($color.A -gt 16) {
          $pixelCount += 1
          if ($x -lt $minX) { $minX = $x }
          if ($x -gt $maxX) { $maxX = $x }
          if ($y -lt $minY) { $minY = $y }
          if ($y -gt $maxY) { $maxY = $y }
        }
      }
    }

    for ($y = 0; $y -lt $image.Height; $y++) {
      for ($x = 0; $x -lt $image.Width; $x++) {
        if ($visited[$x, $y]) { continue }

        $visited[$x, $y] = $true
        $color = $image.GetPixel($x, $y)
        if ($color.A -le 16) { continue }

        $queue = New-Object System.Collections.Generic.Queue[object]
        $queue.Enqueue(@($x, $y))
        $area = 0

        while ($queue.Count -gt 0) {
          $point = $queue.Dequeue()
          $px = [int]$point[0]
          $py = [int]$point[1]
          $area += 1

          foreach ($delta in @(@(1, 0), @(-1, 0), @(0, 1), @(0, -1))) {
            $nx = $px + $delta[0]
            $ny = $py + $delta[1]

            if ($nx -lt 0 -or $ny -lt 0 -or $nx -ge $image.Width -or $ny -ge $image.Height) { continue }
            if ($visited[$nx, $ny]) { continue }

            $visited[$nx, $ny] = $true
            $neighbor = $image.GetPixel($nx, $ny)
            if ($neighbor.A -gt 16) {
              $queue.Enqueue(@($nx, $ny))
            }
          }
        }

        $areas.Add($area)
      }
    }

    $bboxWidth = if ($maxX -ge $minX) { $maxX - $minX + 1 } else { 0 }
    $bboxHeight = if ($maxY -ge $minY) { $maxY - $minY + 1 } else { 0 }
    $sortedAreas = @($areas | Sort-Object -Descending)
    $smallComponents = @($areas | Where-Object { $_ -le 8 }).Count
    $largest = if ($sortedAreas.Count -gt 0) { $sortedAreas[0] } else { 0 }

    [pscustomobject]@{
      Base = $file.Name
      BBox = "${bboxWidth}x${bboxHeight}+${minX},${minY}"
      Pixels = $pixelCount
      Components = $areas.Count
      Largest = $largest
      SmallComponents = $smallComponents
      Areas = ($sortedAreas -join ",")
    }
  } finally {
    $image.Dispose()
  }
}
