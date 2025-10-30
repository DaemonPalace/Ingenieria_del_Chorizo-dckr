#!/usr/bin/env bash
set -euo pipefail

echo "Stopping containers and removing volumes..."
docker compose down -v

echo "Rebuilding images without cache..."
docker compose build --no-cache

echo "Starting fresh stack..."
docker compose up -d
echo "Reset complete."
