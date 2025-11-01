#!/usr/bin/env bash
set -euo pipefail

# Move to script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# --- Check required scripts ---
require_script() {
    local s="$1"
    [[ -f "$s" && -x "$s" ]] && return 0
    echo "ERROR: Missing or not executable: $s" >&2
    exit 1
}

require_script "./bin/linux/install.sh"
require_script "./bin/linux/install-certificates.sh"
require_script "./bin/linux/restart.sh"
require_script "./bin/linux/reset.sh"
require_script "./bin/linux/uninstall.sh"

SUSPEND_SCRIPT="./bin/linux/suspend.sh"
[[ -f "$SUSPEND_SCRIPT" && -x "$SUSPEND_SCRIPT" ]] && SUSPEND_AVAILABLE=true || SUSPEND_AVAILABLE=false

# --- Detect OS ---
detect_os() {
    if [[ -f /etc/debian_version ]]; then
        echo "debian"
    elif command -v pacman &>/dev/null && [[ -f /etc/arch-release ]]; then
        echo "arch"
    else
        echo "unknown"
    fi
}
OS=$(detect_os)

# --- Secret generator ---
generate_secret() {
    local name=$1
    local file=".secrets/${name}"
    mkdir -p .secrets
    openssl rand -base64 32 | tr -d /=+ | cut -c -32 > "$file"
    chmod 600 "$file"
    echo "Generated $name"
}

# --- Display menu ---
show_menu() {
    clear
    echo "=================================="
    echo "  Ingenieria del Chorizo Stack"
    echo "=================================="
    echo "Detected OS: $OS"
    echo
    echo "1) Install (Development Mode)"
    echo "2) Install (Production Mode)"
    echo "3) Generate new secrets & certificates"
    echo "4) Restart stack"
    echo "5) Reset stack (full wipe)"
    [[ "$SUSPEND_AVAILABLE" == true ]] && echo "6) Suspend (stop containers)"
    echo "7) Uninstall"
    echo
    echo "0) Exit"
    echo
}

# --- Main interactive loop ---
while true; do
    show_menu
    read -rp "Choose [0-7]: " choice
    echo

    case "$choice" in
        1)
            ./bin/linux/install.sh development
            ;;
        2)
            ./bin/linux/install.sh production
            ;;
        3)
            echo "Regenerating secrets..."
            rm -rf .secrets
            mkdir -p .secrets
            generate_secret postgres_password
            generate_secret minio_root_user
            generate_secret minio_root_password
            generate_secret jwt_secret

            echo "Regenerating certificates for $OS..."
            ./bin/linux/install-certificates.sh

            echo "Updating .env with new secrets..."
            {
                echo "POSTGRES_USER=arepabuelas"
                echo "POSTGRES_PASSWORD=$(cat .secrets/postgres_password)"
                echo "POSTGRES_DB=arepabuelasdb"
                echo "MINIO_ROOT_USER=$(cat .secrets/minio_root_user)"
                echo "MINIO_ROOT_PASSWORD=$(cat .secrets/minio_root_password)"
                echo "JWT_SECRET=$(cat .secrets/jwt_secret)"
                echo "STORAGE_URL=http://minio:9000"
                echo "MINIO_HOST=minio"
                echo "MINIO_PORT=9000"
            } > .env
            ;;
        4)
            ./bin/linux/restart.sh
            ;;
        5)
            read -rp "Type 'YES' to confirm full reset: " c
            [[ "$c" == "YES" ]] && ./bin/linux/reset.sh || echo "Cancelled."
            ;;
        6)
            if [[ "$SUSPEND_AVAILABLE" == true ]]; then
                ./bin/linux/suspend.sh
            else
                echo "suspend.sh not available."
            fi
            ;;
        7)
            read -rp "Type 'REMOVE' to confirm uninstall: " c
            [[ "$c" == "REMOVE" ]] && ./bin/linux/uninstall.sh || echo "Cancelled."
            ;;
        0)
            echo "Goodbye!"
            exit 0
            ;;
        *)
            echo "Invalid option. Press Enter to continue..."
            read -r
            ;;
    esac

    echo
    read -rp "Press Enter to continue..."
done
