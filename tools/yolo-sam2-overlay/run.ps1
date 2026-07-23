param(
    [Parameter(Mandatory = $true)]
    [string]$Image,
    [ValidateSet(1, 2)]
    [int]$MaxPeople = 2,
    [string]$Device = "cpu"
)

$ErrorActionPreference = "Stop"
$ToolRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$Python = Join-Path $ToolRoot ".venv\Scripts\python.exe"

if (-not (Test-Path $Python)) {
    throw "Virtual environment is missing. Follow README.md setup first."
}

& $Python (Join-Path $ToolRoot "src\pipeline.py") `
    --image $Image `
    --output (Join-Path $ToolRoot "results") `
    --yolo-model (Join-Path $ToolRoot "models\yolo11s-pose.pt") `
    --sam-model (Join-Path $ToolRoot "models\sam2.1_t.pt") `
    --max-people $MaxPeople `
    --device $Device
