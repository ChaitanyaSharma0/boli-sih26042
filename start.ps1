# Start BOLI locally: backend, wait until every model is loaded, frontend.
#
#   .\start.ps1              # backend on 8001 (what frontend/.env expects)
#   .\start.ps1 -Port 8000   # any other port; the frontend is pointed at it
#
# Each server opens in its own window so its log stays visible; close a
# window to stop that server. The backend's first start downloads ~1.7 GB
# of model weights, later starts take about a minute.
param([int]$Port = 8001)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$python = Join-Path $root "backend\.venv\Scripts\python.exe"

if (-not (Test-Path $python)) {
    throw "No backend venv at backend\.venv. Follow 'Running it locally' in README.md first."
}
if (-not (Test-Path (Join-Path $root "backend\.env"))) {
    throw "backend\.env is missing. Copy backend\.env.example and fill it in."
}
if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
    throw "Port $Port is already in use - is a backend already running? Close it or pass -Port."
}

Write-Host "Starting backend on port $Port..."
Start-Process powershell -WorkingDirectory (Join-Path $root "backend") -ArgumentList @(
    "-NoExit", "-Command",
    "& '$python' -m uvicorn main:app --host 127.0.0.1 --port $Port"
)

# /health reports ready only once translation, every TTS voice and ASR
# are in memory, so the frontend never opens onto a half-loaded backend.
$deadline = (Get-Date).AddMinutes(15)
do {
    Start-Sleep -Seconds 3
    try {
        $health = Invoke-RestMethod "http://127.0.0.1:$Port/health" -TimeoutSec 3
        $models = ($health.models.PSObject.Properties | ForEach-Object { "$($_.Name)=$($_.Value)" }) -join " "
        Write-Host "  loading... $models"
    } catch {
        $health = $null
        Write-Host "  waiting for the backend to answer..."
    }
    if ((Get-Date) -gt $deadline) { throw "Backend not ready after 15 minutes - check its window for errors." }
} until ($health -and $health.ready)
Write-Host "Backend ready."

Write-Host "Starting frontend (API: http://127.0.0.1:$Port)..."
Start-Process powershell -WorkingDirectory (Join-Path $root "frontend") -ArgumentList @(
    "-NoExit", "-Command",
    "`$env:VITE_API_BASE = 'http://127.0.0.1:$Port'; npm run dev"
)
Write-Host "Open the address the frontend window prints (normally http://localhost:5173)."
Write-Host "No network on the day? The 'Offline demo' button needs no backend at all."
