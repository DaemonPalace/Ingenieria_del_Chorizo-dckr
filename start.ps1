<#
  Ingenieria del Chorizo - Windows Stack Manager
  Versión PowerShell del start.sh (para ejecutar desde la raíz)
#>

$ErrorActionPreference = "Stop"
Clear-Host

# === Paths ===
$Root = Get-Location
$BinWindows = "$Root\bin\windows"

# === Check Required Scripts ===
Function Require-Script($Path) {
    if (-not (Test-Path $Path)) {
        Write-Host "❌ Missing required script: $Path" -ForegroundColor Red
        Exit 1
    }
}

Require-Script "$BinWindows\install.ps1"
Require-Script "$BinWindows\install-certificates.ps1"
Require-Script "$BinWindows\restart.ps1"
Require-Script "$BinWindows\reset.ps1"
Require-Script "$BinWindows\uninstall.ps1"

$SuspendScript = "$BinWindows\suspend.ps1"
$SuspendAvailable = Test-Path $SuspendScript

# === Secret Generator ===
Function Generate-Secret($Name) {
    $Dir = "$Root\.secrets"
    if (-not (Test-Path $Dir)) { New-Item -ItemType Directory $Dir | Out-Null }
    $Value = [System.Convert]::ToBase64String((New-Object byte[] 32 | ForEach-Object {Get-Random -Minimum 0 -Maximum 255})) -replace '[^A-Za-z0-9]', ''
    $Secret = $Value.Substring(0, [Math]::Min(32, $Value.Length))
    Set-Content -Path "$Dir\$Name" -Value $Secret
    Write-Host "Generated secret: $Name"
}

# === Menu ===
Function Show-Menu {
    Clear-Host
    Write-Host "==================================" -ForegroundColor Cyan
    Write-Host "  Ingenieria del Chorizo Stack     " -ForegroundColor Yellow
    Write-Host "==================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1) Install (Development Mode)"
    Write-Host "2) Install (Production Mode)"
    Write-Host "3) Generate new secrets & certificates"
    Write-Host "4) Restart stack"
    Write-Host "5) Reset stack (full wipe)"
    if ($SuspendAvailable) { Write-Host "6) Suspend (stop containers)" }
    Write-Host "7) Uninstall"
    Write-Host ""
    Write-Host "0) Exit"
    Write-Host ""
}

# === Main Loop ===
while ($true) {
    Show-Menu
    $choice = Read-Host "Choose [0-7]"
    Write-Host ""

    switch ($choice) {
        1 { & "$BinWindows\install.ps1" "development" }
        2 { & "$BinWindows\install.ps1" "production" }
        3 {
            Write-Host "🔐 Regenerating secrets..."
            Remove-Item "$Root\.secrets" -Recurse -Force -ErrorAction SilentlyContinue
            New-Item -ItemType Directory "$Root\.secrets" | Out-Null

            Generate-Secret "postgres_password"
            Generate-Secret "minio_root_user"
            Generate-Secret "minio_root_password"
            Generate-Secret "jwt_secret"

            Write-Host "`n📜 Regenerating certificates..."
            & "$BinWindows\install-certificates.ps1"

            Write-Host "`n⚙️ Updating .env..."
            $envFile = "$Root\.env"
@"
POSTGRES_USER=arepabuelas
POSTGRES_PASSWORD=$(Get-Content "$Root\.secrets\postgres_password")
POSTGRES_DB=arepabuelasdb
MINIO_ROOT_USER=$(Get-Content "$Root\.secrets\minio_root_user")
MINIO_ROOT_PASSWORD=$(Get-Content "$Root\.secrets\minio_root_password")
JWT_SECRET=$(Get-Content "$Root\.secrets\jwt_secret")
STORAGE_URL=http://minio:9000
MINIO_HOST=minio
MINIO_PORT=9000
"@ | Out-File $envFile -Encoding utf8
            Write-Host "✅ .env file updated."
        }
        4 { & "$BinWindows\restart.ps1" }
        5 {
            $confirm = Read-Host "Type 'YES' to confirm full reset"
            if ($confirm -eq "YES") { & "$BinWindows\reset.ps1" } else { Write-Host "Cancelled." }
        }
        6 {
            if ($SuspendAvailable) { & "$SuspendScript" } else { Write-Host "⚠️ suspend.ps1 not found." }
        }
        7 {
            $confirm = Read-Host "Type 'REMOVE' to confirm uninstall"
            if ($confirm -eq "REMOVE") { & "$BinWindows\uninstall.ps1" } else { Write-Host "Cancelled." }
        }
        0 { Write-Host "👋 Goodbye!"; Exit 0 }
        Default {
            Write-Host "Invalid option. Press Enter to continue..."
            Read-Host
        }
    }

    Write-Host ""
    Read-Host "Press Enter to continue..."
}
