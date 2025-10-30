#!/bin/sh
set -e

# Export secrets as env vars for the app
export DB_USER=$(cat /run/secrets/postgres_user)
export DB_PASS=$(cat /run/secrets/postgres_password)
export DB_NAME=$(cat /run/secrets/postgres_db)
export MINIO_ACCESS_KEY=$(cat /run/secrets/minio_root_user)
export MINIO_SECRET_KEY=$(cat /run/secrets/minio_root_password)
export STORAGE_URL=$(cat /run/secrets/storage_url)
export MINIO_HOST=$(cat /run/secrets/minio_host)
export MINIO_PORT=$(cat /run/secrets/minio_port)

exec "$@"