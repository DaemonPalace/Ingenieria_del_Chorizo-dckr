$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path "$PSScriptRoot\..\..")

Write-Host "🧹 Stopping containers and removing volumes..."
docker compose down -v

Write-Host "🧼 Cleaning local data..."
Remove-Item "./db/data/*", "./minio/data/*", "./.secrets/*, ./backend/*.js" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "🛠️ Rebuilding images (no cache)..."
docker compose build --no-cache

Write-Host "🚀 Starting stack..."
docker compose up -d
Write-Host "✅ Reset complete."
