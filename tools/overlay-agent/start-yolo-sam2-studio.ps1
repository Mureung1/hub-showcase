$ErrorActionPreference = "Stop"
$OverlayRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$InferenceRoot = Join-Path (Split-Path -Parent $OverlayRoot) "yolo-sam2-overlay"
$Python = Join-Path $InferenceRoot ".venv\Scripts\python.exe"
$WebRoot = Join-Path $OverlayRoot "web"
$ApiPort = 8002
$ApiRoot = "http://127.0.0.1:$ApiPort"

if (-not (Test-Path $Python)) {
    throw "YOLO/SAM2 environment is missing. Follow tools/yolo-sam2-overlay/README.md first."
}

$Backend = $null
try {
    $assets = Invoke-RestMethod -Uri "$ApiRoot/api/layout-assets" -TimeoutSec 1
    if (-not $assets -or @($assets).Count -lt 30) {
        throw "The API is running but is not serving the canonical photo-guide dataset."
    }
    Write-Host "Reusing the canonical Photo Navigation API already running on port $ApiPort."
}
catch {
    $Backend = Start-Process `
        -FilePath $Python `
        -ArgumentList "-m", "uvicorn", "src.server:app", "--host", "127.0.0.1", "--port", $ApiPort `
        -WorkingDirectory $InferenceRoot `
        -WindowStyle Hidden `
        -PassThru
}

try {
    Push-Location $WebRoot
    $env:VITE_API_TARGET = $ApiRoot
    Write-Host "YOLO/SAM2 API: $ApiRoot"
    Write-Host "Overlay Studio will open at the Vite URL below. Press Ctrl+C to stop both servers."
    & npm.cmd run dev
}
finally {
    Pop-Location
    if ($Backend -and -not $Backend.HasExited) {
        Stop-Process -Id $Backend.Id
    }
}
