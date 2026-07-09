param (
    [Parameter(Mandatory=$true)]
    [string]$FilePath
)

if (Test-Path $FilePath) {
    Write-Host "Opening file: $FilePath"
    Start-Process $FilePath
} else {
    Write-Host "Error: File not found at $FilePath"
    exit 1
}
