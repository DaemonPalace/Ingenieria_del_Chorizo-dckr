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

Write-Host "🚀 Installing Arepabuelas stack in mode: $Mode" -ForegroundColor Cyan

# Normalize mode
switch ($Mode) {
    "dev" { $Mode = "development" }
    "d"   { $Mode = "development" }
    "prod" { $Mode = "production" }
    "p"   { $Mode = "production" }
}

# === Clean old secrets ===
Write-Host "🧹 Cleaning old secrets and backend app.js..."
Remove-Item "$ProjectRoot\.secrets" -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory "$ProjectRoot\.secrets" | Out-Null
Remove-Item "$ProjectRoot\backend\app.js" -Force -ErrorAction SilentlyContinue

# === Generate secrets (robust version) ===
Function New-Secret {
    param($Name)
    $Path = "$ProjectRoot\.secrets\$Name"

    # Generate long random string and clean invalid chars
    $Raw = [System.Convert]::ToBase64String(
        (1..48 | ForEach-Object { Get-Random -Minimum 0 -Maximum 255 })
    ) -replace '[^A-Za-z0-9]', ''

    # Ensure at least 32 characters
    if ($Raw.Length -lt 32) {
        $Extra = -join ((65..90) + (97..122) | Get-Random -Count (32 - $Raw.Length) | ForEach-Object { [char]$_ })
        $Raw += $Extra
    }

    $Secret = $Raw.Substring(0, 32)
    Set-Content -Path $Path -Value $Secret -Encoding UTF8
    Write-Host "🔑 Generated secret: $Name"
}

# === Generate all secrets ===
New-Secret "postgres_password"
New-Secret "minio_root_user"
New-Secret "minio_root_password"
New-Secret "jwt_secret"

# === Copy backend app.js based on mode ===
if ($Mode -eq "development") {
    Copy-Item "$ProjectRoot\backend\app.js.dev" "$ProjectRoot\backend\app.js" -Force
    Write-Host "🧩 Using backend/app.js.dev"
} else {
    Copy-Item "$ProjectRoot\backend\app.js.prod" "$ProjectRoot\backend\app.js" -Force
    Write-Host "🧩 Using backend/app.js.prod"
}

# === Select docker-compose ===
if ($Mode -eq "development") {
    Copy-Item "$ProjectRoot\docker-compose.yml.dev" "$ProjectRoot\docker-compose.yml" -Force
    Write-Host "🐳 Using docker-compose.yml.dev"
    
    # Create .env file
@"
POSTGRES_USER=arepabuelas
POSTGRES_PASSWORD=$(Get-Content "$ProjectRoot\.secrets\postgres_password")
POSTGRES_DB=arepabuelasdb
MINIO_ROOT_USER=$(Get-Content "$ProjectRoot\.secrets\minio_root_user")
MINIO_ROOT_PASSWORD=$(Get-Content "$ProjectRoot\.secrets\minio_root_password")
JWT_SECRET=$(Get-Content "$ProjectRoot\.secrets\jwt_secret")
STORAGE_URL=http://minio:9000
MINIO_HOST=minio
MINIO_PORT=9000
"@ | Out-File "$ProjectRoot\.env" -Encoding utf8

    Write-Host "✅ .env file generated successfully."
}
else {
    Copy-Item "$ProjectRoot\docker-compose.yml.prod" "$ProjectRoot\docker-compose.yml" -Force
    Remove-Item "$ProjectRoot\.env" -Force -ErrorAction SilentlyContinue
    Write-Host "🐳 Using docker-compose.yml.prod (no .env created)"
}

# === Certificates ===
$CertScript = "$ScriptDir\install-certificates.ps1"
if (Test-Path $CertScript) {
    Write-Host "🔒 Running certificate installation..."
    & $CertScript
} else {
    Write-Host "⚠️ No certificate script found for Windows."
}

# === Start Docker stack ===
Write-Host "`n🚢 Starting Docker stack (mode: $Mode)..."
docker compose up -d --build

Write-Host "`n✅ Stack is running successfully!"
Write-Host "🌐 Web: http://localhost"
Write-Host "🗃️  MinIO Console: http://localhost:9001"
Write-Host "🔐 Secrets in: $ProjectRoot\.secrets"
Write-Host "⚙️  Backend running from: backend/app.js"
