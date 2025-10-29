#!/usr/bin/env bash
set -euo pipefail

# -------------------------------------------------
# 1. Generate strong random secrets (if they do not exist)
# -------------------------------------------------
generate_secret() {
  local name=$1
  local file=".secrets/${name}"
  if [[ ! -f "$file" ]]; then
    mkdir -p .secrets
    openssl rand -base64 32 | tr -d /=+ | cut -c -32 > "$file"
    chmod 600 "$file"  # Secure permissions
    echo "Generated $name"
  else
    echo "Secret $name already exists"
  fi
}

generate_secret postgres_password
generate_secret minio_root_user
generate_secret minio_root_password

# -------------------------------------------------
# 2. Bring stack up (NO docker secret create!)
# -------------------------------------------------
docker compose up -d --build

echo "Stack is running!"
echo "   Web: http://localhost"
echo "   MinIO Console: http://localhost:9001"
echo "   Credentials in .secrets/"