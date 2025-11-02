#!/usr/bin/env bash
set -euo pipefail

# --- CHANGE TO PROJECT ROOT (critical!) ---
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

echo "Stopping containers and removing volumes..."
docker compose down -v

echo "Cleaning local data directories..."
rm -rf ./db/data/* ./minio/data/* .secrets/*

echo "Rebuilding images without cache..."
docker compose build --no-cache

echo "Starting fresh stack..."
docker compose up -d
echo "Reset complete."
