#!/usr/bin/env bash
set -euo pipefail

# ================================================================
# install.sh – production installer only
# Works when the script is inside ./bin/linux/
# ================================================================

# 1. Find the project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"   # ./bin/linux
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"             # go up two levels → project root
cd "$PROJECT_ROOT"

# 2. Parse mode (only production allowed)
MODE="${1:-}"
case "$MODE" in
    production|prod|p) MODE="production" ;;
    *)
        echo "ERROR: This installer is **production-only**."
        echo "Usage: $0 <production|prod|p>"
        exit 1
        ;;
esac

echo "Installing in $MODE mode (project root: $PROJECT_ROOT)..."

# 3. Clean old secrets & old app files
echo "Removing old secrets and backend app files..."
rm -rf "$PROJECT_ROOT/.secrets"
mkdir -p "$PROJECT_ROOT/.secrets"
rm -f "$PROJECT_ROOT/backend/app.js" "$PROJECT_ROOT/backend/upload_images_only.js"

# 4. Generate fresh secrets (Docker will read them as files)
generate_secret() {
    local name=$1
    local file="$PROJECT_ROOT/.secrets/${name}"
    openssl rand -base64 32 | tr -d /=+ | cut -c -32 > "$file"
    chmod 600 "$file"
    echo "Generated $name"
}
generate_secret postgres_password
generate_secret minio_root_user
generate_secret minio_root_password
generate_secret jwt_secret

# 5. Copy production app files
APP_SRC="$PROJECT_ROOT/backend/app.js.prod"
APP_SRC2="$PROJECT_ROOT/backend/upload_images_only.js.prod"

[[ ! -f "$APP_SRC" ]] && { echo "ERROR: Missing $APP_SRC"; ls -l "$PROJECT_ROOT/backend/"; exit 1; }
[[ ! -f "$APP_SRC2" ]] && { echo "ERROR: Missing $APP_SRC2"; ls -l "$PROJECT_ROOT/backend/"; exit 1; }

cp -v "$APP_SRC"  "$PROJECT_ROOT/backend/app.js"
cp -v "$APP_SRC2" "$PROJECT_ROOT/backend/upload_images_only.js"
echo "Copied production app files"

# 6. Use production docker-compose
COMPOSE_SRC="$PROJECT_ROOT/docker-compose.yml.prod"
[[ ! -f "$COMPOSE_SRC" ]] && { echo "ERROR: Missing $COMPOSE_SRC"; exit 1; }
cp -f "$COMPOSE_SRC" "$PROJECT_ROOT/docker-compose.yml"
echo "Using docker-compose.yml.prod"

# Remove any stray .env (production uses Docker secrets only)
rm -f "$PROJECT_ROOT/.env" "$PROJECT_ROOT/docker-vars.env"
echo "Environment: Docker secrets (no .env file)"

# 7. Generate certificates (if script exists)
OS_SCRIPT="$SCRIPT_DIR/install-certificates.sh"
if [[ -f "$OS_SCRIPT" ]]; then
    echo "Generating certificates with $OS_SCRIPT ..."
    "$OS_SCRIPT"
else
    echo "No certificate script found – skipping SSL generation."
fi

# 8. Start the stack
echo "Building & starting production stack..."
docker compose up -d --build

# 9. Summary
echo
echo "Production stack is running!"
echo " • Web:          https://localhost"
echo " • MinIO Console: https://localhost:9001"
echo " • Secrets:      Managed via Docker"
echo " • App:          backend/app.js (from $APP_SRC)"