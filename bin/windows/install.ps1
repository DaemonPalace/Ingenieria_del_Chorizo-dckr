Param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("production", "prod", "p")]
    [string]$Mode
)

$ErrorActionPreference = "Stop"

# === Paths ===
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path "$ScriptDir\..\.."
Set-Location $ProjectRoot

Write-Host "Installing in PRODUCTION mode..." -ForegroundColor Green

# === Clean old secrets & app files ===
Write-Host "Cleaning old secrets and backend app files..."
Remove-Item "$ProjectRoot\.secrets" -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory "$ProjectRoot\.secrets" | Out-Null

Remove-Item "$ProjectRoot\backend\app.js" -Force -ErrorAction SilentlyContinue
Remove-Item "$ProjectRoot\backend\upload_images_only.js" -Force -ErrorAction SilentlyContinue

# === Generate fresh secrets ===
Function New-Secret {
    param([string]$Name)
    $Path = "$ProjectRoot\.secrets\$Name"
    $SecureRandom = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $Bytes = New-Object byte[] 32
    $SecureRandom.GetBytes($Bytes)
    $Base64 = [Convert]::ToBase64String($Bytes)
    # Remove non-alphanumeric and truncate to 32 chars
    $Secret = ($Base64 -replace '[^A-Za-z0-9]', '').Substring(0, 32)
    Set-Content -Path $Path -Value $Secret -Encoding ASCII
    Write-Host "Generated secret: $Name"
}

New-Secret "postgres_password"
New-Secret "minio_root_user"
New-Secret "minio_root_password"
New-Secret "jwt_secret"

# === Copy production app files ===
$AppSrc = "$ProjectRoot\backend\app.js.prod"
$UploadSrc = "$ProjectRoot\backend\upload_images_only.js.prod"

if (-not (Test-Path $AppSrc)) {
    Write-Error "Missing required file: $AppSrc"
    exit 1
}
if (-not (Test-Path $UploadSrc)) {
    Write-Error "Missing required file: $UploadSrc"
    exit 1
}

Copy-Item $AppSrc "$ProjectRoot\backend\app.js" -Force
Copy-Item $UploadSrc "$ProjectRoot\backend\upload_images_only.js" -Force
Write-Host "Copied production app files"

# === Use production docker-compose ===
$ComposeSrc = "$ProjectRoot\docker-compose.yml.prod"
if (-not (Test-Path $ComposeSrc)) {
    Write-Error "Missing required file: $ComposeSrc"
    exit 1
}

Copy-Item $ComposeSrc "$ProjectRoot\docker-compose.yml" -Force
Write-Host "Using docker-compose.yml.prod"

# Ensure no .env exists (production uses Docker secrets)
Remove-Item "$ProjectRoot\.env" -Force -ErrorAction SilentlyContinue
Remove-Item "$ProjectRoot\docker-vars.env" -Force -ErrorAction SilentlyContinue
Write-Host "Environment: Docker secrets only (no .env)"

# === Generate certificates (if script exists) ===
$CertScript = "$ScriptDir\install-certificates.ps1"
if (Test-Path $CertScript) {
    Write-Host "Generating certificates..."
    & $CertScript
} else {
    Write-Host "No certificate script found – skipping SSL generation."
}

# === Start Docker stack ===
Write-Host "Building and starting production stack..." -ForegroundColor Cyan
docker compose up -d --build

# === Final Summary ===
Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "PRODUCTION STACK IS RUNNING!" -ForegroundColor Green
Write-Host " • Web:           https://localhost" -ForegroundColor Yellow
Write-Host " • MinIO Console: https://localhost:9001" -ForegroundColor Yellow
Write-Host " • Secrets:       Handled by Docker" -ForegroundColor Cyan
Write-Host " • App:           backend\app.js (from .prod)" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Green