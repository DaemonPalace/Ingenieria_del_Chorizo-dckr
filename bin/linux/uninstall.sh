#!/usr/bin/env bash
set -euo pipefail

echo "Full teardown..."
docker compose down -v --remove-orphans

echo "Removing local data directories..."
rm -rf ./db/data ./minio/data ./.secrets ./docker-compose.yml ./certs ./backend/*.js

echo "Uninstall complete."
