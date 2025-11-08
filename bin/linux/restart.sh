#!/usr/bin/env bash
set -euo pipefail

echo "Stopping containers..."
docker compose down

echo "Rebuilding images..."
docker compose build

echo "Starting fresh stack..."
docker compose up -d
echo "Reset complete."
