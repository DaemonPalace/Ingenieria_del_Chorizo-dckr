$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path "$PSScriptRoot\..\..")

Write-Host "♻️ Restarting Docker stack..."
docker compose down
docker compose build
docker compose up -d
Write-Host "✅ Restart complete."
