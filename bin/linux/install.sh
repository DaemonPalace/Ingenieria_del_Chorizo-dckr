#!/usr/bin/env bash
set -euo pipefail

# ================================================================
# install.sh – dev / prod installer
# Works when the script is inside ./bin/linux/
# ================================================================

# 1. Find the project root (the folder that contains backend/, docker-compose.yml.* etc.)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"    # ./bin/linux
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"               # go up two levels → project root
cd "$PROJECT_ROOT"

# 2. Parse mode --------------------------------------------------
MODE="${1:-}"
if [[ -z "$MODE" ]]; then
    echo "Usage: $0 <development|production>"
    exit 1
fi

case "$MODE" in
    development|dev|d) MODE="development" ;;
    production|prod|p) MODE="production" ;;
    *)
        echo "Invalid mode: $MODE"
        exit 1
        ;;
esac

echo "Installing in $MODE mode (project root: $PROJECT_ROOT)..."

# 3. Clean old secrets & old app.js ------------------------------
echo "Removing old secrets and backend/app.js ..."
rm -rf "$PROJECT_ROOT/.secrets"
mkdir -p "$PROJECT_ROOT/.secrets"
rm -f "$PROJECT_ROOT/backend/app.js"

# 4. Generate fresh secrets --------------------------------------
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

# 5. Copy the correct app.js -------------------------------------
if [[ "$MODE" == "development" ]]; then
    APP_SRC="$PROJECT_ROOT/backend/app.js.dev"
else
    APP_SRC="$PROJECT_ROOT/backend/app.js.prod"
fi

if [[ ! -f "$APP_SRC" ]]; then
    echo "ERROR: Source file not found: $APP_SRC"
    echo "Current directory: $(pwd)"
    echo "Contents of backend/:"
    ls -l "$PROJECT_ROOT/backend/"
    exit 1
fi

cp -v "$APP_SRC" "$PROJECT_ROOT/backend/app.js"
echo "Copied $APP_SRC → backend/app.js"

# 6. Copy the correct docker-compose file ------------------------
if [[ "$MODE" == "development" ]]; then
    COMPOSE_SRC="$PROJECT_ROOT/docker-compose.yml.dev"
    [[ ! -f "$COMPOSE_SRC" ]] && { echo "Missing $COMPOSE_SRC"; exit 1; }
    cp -f "$COMPOSE_SRC" "$PROJECT_ROOT/docker-compose.yml"
    echo "Using docker-compose.yml.dev"

    # Create .env for development
    echo "Creating .env with generated secrets..."
    {
        echo "POSTGRES_USER=arepabuelas"
        echo "POSTGRES_PASSWORD=$(cat "$PROJECT_ROOT/.secrets/postgres_password")"
        echo "POSTGRES_DB=arepabuelasdb"
        echo "MINIO_ROOT_USER=$(cat "$PROJECT_ROOT/.secrets/minio_root_user")"
        echo "MINIO_ROOT_PASSWORD=$(cat "$PROJECT_ROOT/.secrets/minio_root_password")"
        echo "JWT_SECRET=$(cat "$PROJECT_ROOT/.secrets/jwt_secret")"
        echo "STORAGE_URL=http://minio:9000"
        echo "MINIO_HOST=minio"
        echo "MINIO_PORT=9000"
    } > "$PROJECT_ROOT/.env"
    echo "Environment: .env (generated with secrets)"
else
    COMPOSE_SRC="$PROJECT_ROOT/docker-compose.yml.prod"
    [[ ! -f "$COMPOSE_SRC" ]] && { echo "Missing $COMPOSE_SRC"; exit 1; }
    cp -f "$COMPOSE_SRC" "$PROJECT_ROOT/docker-compose.yml"
    echo "Using docker-compose.yml.prod"
    rm -f "$PROJECT_ROOT/.env"
    echo "Environment: Docker secrets (no .env)"
fi

# 7. Generate certificates ---------------------------------------
OS_SCRIPT="$SCRIPT_DIR/install-certificates.sh"
if [[ -f "$OS_SCRIPT" ]]; then
    echo "Generating certificates with $OS_SCRIPT ..."
    "$OS_SCRIPT"
else
    echo "No cert script for this OS – skipping SSL."
fi

# 8. Start the stack ---------------------------------------------
echo "Starting stack in $MODE mode..."
docker compose up -d --build

# 9. Summary ------------------------------------------------------
echo
echo "Stack is running!"
echo "  Web: http://localhost"
echo "  MinIO Console: http://localhost:9001"
echo "  Credentials stored in: $PROJECT_ROOT/.secrets/"
if [[ "$MODE" == "development" ]]; then
    echo "  Environment file: .env"
else
    echo "  Secrets managed via Docker"
fi
echo "  App: backend/app.js (from $APP_SRC)"
