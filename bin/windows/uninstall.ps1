$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path "$PSScriptRoot\..\..")

Write-Host "💣 Full teardown..."
docker compose down -v --remove-orphans

Write-Host "🧹 Removing data directories..."
Remove-Item "./db/data", "./minio/data", "./.secrets", "./certs", "./docker-compose.yml ./backend/*.js" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "✅ Uninstall complete."
