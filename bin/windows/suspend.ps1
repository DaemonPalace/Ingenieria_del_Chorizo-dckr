$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path "$PSScriptRoot\..\..")

Write-Host "⏸️ Stopping containers (data preserved)..."
docker compose down
Write-Host "✅ Containers stopped (data preserved)."
