<#
  Ingenieria del Chorizo - Windows Stack Manager
  Production-only installer with system update
#>
$ErrorActionPreference = "Stop"
Clear-Host

# === Paths ===
$Root = Get-Location
$BinWindows = "$Root\bin\windows"

# === Check Required Scripts ===
Function Require-Script($Path) {
    if (-not (Test-Path $Path)) {
        Write-Host "Missing required script: $Path" -ForegroundColor Red
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

# === Secret Generator (internal use only) ===
Function Generate-Secret($Name) {
    $Dir = "$Root\.secrets"
    if (-not (Test-Path $Dir)) { New-Item -ItemType Directory $Dir | Out-Null }
    $Value = [System.Convert]::ToBase64String((1..32 | ForEach-Object {Get-Random -Maximum 256})) -replace '[^A-Za-z0-9]', ''
    $Secret = $Value.Substring(0, [Math]::Min(32, $Value.Length))
    Set-Content -Path "$Dir\$Name" -Value $Secret
    Write-Host "Generated secret: $Name"
}

# === Update System & Repository ===
Function Update-SystemRepo {
    Write-Host "`n=== Pulling latest code from GitHub ===" -ForegroundColor Cyan
    try {
        # Ensure remote origin is set
        $remoteUrl = "https://github.com/DaemonPalace/Ingenieria_del_Chorizo-dckr.git"
        git remote set-url origin $remoteUrl 2>$null
        git pull $remoteUrl
        Write-Host "Repository updated." -ForegroundColor Green
    } catch {
        Write-Host "Error: git pull failed. Is Git installed and repository cloned?" -ForegroundColor Red
    }
}

# === Menu (exactly as requested) ===
Function Show-Menu {
    Clear-Host
    Write-Host "==================================" -ForegroundColor Cyan
    Write-Host " Ingenieria del Chorizo Stack " -ForegroundColor Yellow
    Write-Host "==================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1) Install Web Application" -ForegroundColor White
    Write-Host "2) Update Repository" -ForegroundColor White
    Write-Host "3) Restart stack" -ForegroundColor White
    Write-Host "4) Reset stack (full wipe)" -ForegroundColor White
    if ($SuspendAvailable) { Write-Host "5) Suspend (stop containers)" -ForegroundColor White }
    Write-Host "6) Uninstall" -ForegroundColor White
    Write-Host ""
    Write-Host "0) Exit" -ForegroundColor Gray
    Write-Host ""
}

# === Main Loop ===
while ($true) {
    Show-Menu
    $choice = Read-Host "Choose [0-$([int]$SuspendAvailable + 5)]"

    switch ($choice) {
        1 {
            Write-Host "=== Installing Web Application (Production Mode) ===" -ForegroundColor Green
            & "$BinWindows\install.ps1" "production"
        }

        2 {
            Update-SystemRepo
        }

        3 {
            & "$BinWindows\restart.ps1"
        }

        4 {
            $confirm = Read-Host "Type 'YES' to confirm full reset"
            if ($confirm -eq "YES") {
                & "$BinWindows\reset.ps1"
            } else {
                Write-Host "Cancelled." -ForegroundColor Yellow
            }
        }

        5 {
            if ($SuspendAvailable) {
                & $SuspendScript
            } else {
                Write-Host "suspend.ps1 not available." -ForegroundColor Yellow
            }
        }

        6 {
            $confirm = Read-Host "Type 'REMOVE' to confirm uninstall"
            if ($confirm -eq "REMOVE") {
                & "$BinWindows\uninstall.ps1"
            } else {
                Write-Host "Cancelled." -ForegroundColor Yellow
            }
        }

        0 {
            Write-Host "Goodbye!" -ForegroundColor Cyan
            Exit 0
        }

        default {
            Write-Host "Invalid option. Press Enter to continue..." -ForegroundColor Red
            Read-Host | Out-Null
        }
    }

    Write-Host ""
    Read-Host "Press Enter to continue..." | Out-Null
}