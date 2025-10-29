#!/usr/bin/env bash
set -euo pipefail

echo "Full teardown..."
docker compose down -v --remove-orphans

echo "Removing Docker secrets..."
for s in postgres_user postgres_password postgres_db \
         minio_root_user minio_root_password \
         storage_url minio_host minio_port; do
  if docker secret ls --format "{{.Name}}" | grep -q "^${s}$"; then
    docker secret rm "$s"
    echo "Removed secret $s"
  fi
done

echo "Removing local data directories..."
rm -rf ./db/data ./minio/data .secrets

echo "Uninstall complete."
