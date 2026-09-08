# Kahaani-Check Local Development Runner
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   KAHAANI-CHECK — LOCAL DEV ENVIRONMENT" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$WorkspaceRoot = $PSScriptRoot
$BackendDir = Join-Path $WorkspaceRoot "kahaani-check-backend"
$FrontendDir = Join-Path $WorkspaceRoot "kahaani-check-frontend-main"

# 1. Check Backend Environment
Write-Host "`n[1/4] Checking Backend Environment..." -ForegroundColor Yellow
$BackendVenv = Join-Path $BackendDir ".venv"
$BackendPython = Join-Path $BackendVenv "Scripts\python.exe"
$BackendUvicorn = Join-Path $BackendVenv "Scripts\uvicorn.exe"

if (-not (Test-Path $BackendPython)) {
    Write-Host "Creating Python virtual environment in $BackendVenv..." -ForegroundColor Gray
    python -m venv $BackendVenv
    & (Join-Path $BackendVenv "Scripts\pip.exe") install -r (Join-Path $BackendDir "requirements.txt")
}

$BackendEnv = Join-Path $BackendDir ".env"
if (-not (Test-Path $BackendEnv)) {
    Write-Host "Creating default .env for backend..." -ForegroundColor Gray
    @"
SUPABASE_URL=http://localhost:54321
SUPABASE_SECRET_KEY=local-dev-secret-key
LOCAL_DEV_MODE=true
WHISPER_MODEL_SIZE=tiny
WHISPER_DEVICE=cpu
WHISPER_COMPUTE_TYPE=int8
WHISPER_LANGUAGE=hi
"@ | Out-File -FilePath $BackendEnv -Encoding utf8
}

# 2. Check Frontend Environment
Write-Host "`n[2/4] Checking Frontend Environment..." -ForegroundColor Yellow
$FrontendNodeModules = Join-Path $FrontendDir "node_modules"
if (-not (Test-Path $FrontendNodeModules)) {
    Write-Host "Installing frontend npm dependencies..." -ForegroundColor Gray
    Push-Location $FrontendDir
    npm install
    Pop-Location
}

$FrontendEnv = Join-Path $FrontendDir ".env.local"
if (-not (Test-Path $FrontendEnv)) {
    Write-Host "Creating default .env.local for frontend..." -ForegroundColor Gray
    @"
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=local-anon-key
NEXT_PUBLIC_LOCAL_DEV=true
"@ | Out-File -FilePath $FrontendEnv -Encoding utf8
}

# 3. Launching
Write-Host "`n[3/4] Ready to launch!" -ForegroundColor Green
Write-Host "  -> Backend API: http://localhost:8000" -ForegroundColor White
Write-Host "  -> API Docs:    http://localhost:8000/docs" -ForegroundColor White
Write-Host "  -> Frontend UI: http://localhost:3000" -ForegroundColor White

Write-Host "`n[4/4] Starting servers with concurrently (Press Ctrl+C to stop)..." -ForegroundColor Cyan
npx -y concurrently -n "backend,frontend" -c "blue.bold,green.bold" `
    "powershell -ExecutionPolicy Bypass -Command `\"& '$BackendUvicorn' app.main:app --reload --host 127.0.0.1 --port 8000 --app-dir '$BackendDir'`\"" `
    "powershell -ExecutionPolicy Bypass -Command `\"cd '$FrontendDir'; npm run dev`\""
