#!/bin/bash
set -euo pipefail

echo "Iniciando backend Arepabuelas..."

# Wait for PostgreSQL
echo "Esperando a PostgreSQL (5432)..."
while ! timeout 5s bash -c "echo > /dev/tcp/db/5432" >/dev/null 2>&1; do
  echo "Esperando a PostgreSQL (5432)..."
  sleep 2
done
echo "PostgreSQL listo!"

# Wait for MinIO (optional)
echo "Esperando a MinIO (9000)..."
while ! timeout 5s bash -c "echo > /dev/tcp/minio/9000" >/dev/null 2>&1; do
  echo "Esperando a MinIO (9000)..."
  sleep 2
done
echo "MinIO listo!"

# Start Node.js app
exec npm start