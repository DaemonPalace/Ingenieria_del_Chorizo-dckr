Param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("development", "production", "dev", "prod", "d", "p")]
    [string]$Mode
)

$ErrorActionPreference = "Stop"

# === Paths ===
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path "$ScriptDir\..\.."
Set-Location $ProjectRoot

Write-Host "Installing in mode: $Mode"

# Normalize mode
switch ($Mode) {
    "dev" { $Mode = "development" }
    "d"   { $Mode = "development" }
    "prod" { $Mode = "production" }
    "p"   { $Mode = "production" }
}

# === Clean old secrets ===
Write-Host "Cleaning old secrets and backend app.js..."
Remove-Item "$ProjectRoot\.secrets" -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory "$ProjectRoot\.secrets" | Out-Null
Remove-Item "$ProjectRoot\backend\app.js" -Force -ErrorAction SilentlyContinue

# === Generate secrets ===
Function New-Secret {
    param($Name)
    $Path = "$ProjectRoot\.secrets\$Name"
    $Bytes = New-Object byte[] 32
    (New-Object System.Random).NextBytes($Bytes)
    $Base64 = [System.Convert]::ToBase64String($Bytes)
    $Secret = ($Base64 -replace '[^A-Za-z0-9]', '').Substring(0, [Math]::Min(32, $Base64.Length))
    Set-Content -Path $Path -Value $Secret -Encoding ascii
    Write-Host "Generated secret: $Name"
}

New-Secret "postgres_password"
New-Secret "minio_root_user"
New-Secret "minio_root_password"
New-Secret "jwt_secret"

# === Copy app.js ===
if ($Mode -eq "development") {
    Copy-Item "$ProjectRoot\backend\app.js.dev" "$ProjectRoot\backend\app.js" -Force
    Copy-Item "$ProjectRoot\backend\upload_images_only.js.dev" "$ProjectRoot\backend\upload_images_only.js" -Force
} else {
    Copy-Item "$ProjectRoot\backend\app.js.prod" "$ProjectRoot\backend\app.js" -Force
    Copy-Item "$ProjectRoot\backend\upload_images_only.js.prod" "$ProjectRoot\backend\upload_images_only.js" -Force
}

# === docker-compose selection ===
if ($Mode -eq "development") {
    Copy-Item "$ProjectRoot\docker-compose.yml.dev" "$ProjectRoot\docker-compose.yml" -Force
    Write-Host "Using docker-compose.yml.dev"

    # Create .env
    $envContent = @'
POSTGRES_USER=arepabuelas
POSTGRES_PASSWORD={0}
POSTGRES_DB=arepabuelasdb
MINIO_ROOT_USER={1}
MINIO_ROOT_PASSWORD={2}
JWT_SECRET={3}
STORAGE_URL=http://minio:9000
MINIO_HOST=minio
MINIO_PORT=9000
'@ -f `
    (Get-Content "$ProjectRoot\.secrets\postgres_password"),
    (Get-Content "$ProjectRoot\.secrets\minio_root_user"),
    (Get-Content "$ProjectRoot\.secrets\minio_root_password"),
    (Get-Content "$ProjectRoot\.secrets\jwt_secret")

    $envPath = Join-Path $ProjectRoot ".env"
    $envContent | Out-File -FilePath $envPath -Encoding utf8 -Force
    Write-Host "Generated .env file at: $envPath"
}
else {
    Copy-Item "$ProjectRoot\docker-compose.yml.prod" "$ProjectRoot\docker-compose.yml" -Force
    Remove-Item "$ProjectRoot\.env" -Force -ErrorAction SilentlyContinue
    Write-Host "Using docker-compose.yml.prod"
}

# === Certificates ===
$CertScript = "$ScriptDir\install-certificates.ps1"
if (Test-Path $CertScript) {
    Write-Host "Generating certificates..."
    & $CertScript
} else {
    Write-Host "No certificate script found for Windows."
}

# === Start Docker stack ===
Write-Host "Starting Docker stack..."
docker compose up -d --build

Write-Host ""
Write-Host "========================================="
Write-Host "Stack is running successfully!"
Write-Host "Web: http://localhost"
Write-Host "MinIO Console: http://localhost:9001"
Write-Host "Secrets folder: $ProjectRoot\.secrets"
Write-Host "App file: backend/app.js"
Write-Host "========================================="
