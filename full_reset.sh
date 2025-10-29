#!/usr/bin/env bash
set -euo pipefail

echo "Stopping containers and removing volumes..."
docker compose down -v

echo "Cleaning local data directories..."
rm -rf ./db/data/* ./minio/data/* .secrets/*

echo "Rebuilding images without cache..."
docker compose build --no-cache

echo "Starting fresh stack..."
./init.sh
echo "Reset complete."
