#!/usr/bin/env bash
set -euo pipefail

# -------------------------------------------------
# Move to script directory
# -------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# -------------------------------------------------
# Check required helper scripts
# -------------------------------------------------
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

# -------------------------------------------------
# Detect OS
# -------------------------------------------------
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

# -------------------------------------------------
# Secret generator (internal use only)
# -------------------------------------------------
generate_secret() {
    local name=$1
    local file=".secrets/${name}"
    mkdir -p .secrets
    openssl rand -base64 32 | tr -d /=+ | cut -c -32 > "$file"
    chmod 600 "$file"
    echo "Generated $name"
}

# -------------------------------------------------
# MENU (exactly as requested, production install only)
# -------------------------------------------------
show_menu() {
    clear
    echo "=================================="
    echo " Ingenieria del Chorizo Stack"
    echo "=================================="
    echo "Detected OS: $OS"
    echo
    echo "1) Install Web Application"
    echo "2) Update System/Repository"
    echo "3) Restart stack"
    echo "4) Reset stack (full wipe)"
    [[ "$SUSPEND_AVAILABLE" == true ]] && echo "5) Suspend (stop containers)"
    echo "6) Uninstall"
    echo
    echo "0) Exit"
    echo
}

# -------------------------------------------------
# UPDATE SYSTEM / REPOSITORY
# -------------------------------------------------
update_system_repo() {
    echo "=== Updating system packages (apt) ==="
    sudo apt update -y && sudo apt upgrade -y

    echo "=== Pulling latest code from GitHub ==="
    git remote set-url origin https://github.com/DaemonPalace/Ingenieria_del_Chorizo-dckr.git 2>/dev/null || true
    git pull https://github.com/DaemonPalace/Ingenieria_del_Chorizo-dckr.git
    echo "Update finished."
}

# -------------------------------------------------
# MAIN LOOP
# -------------------------------------------------
while true; do
    show_menu
    read -rp "Choose [0-6]: " choice
    echo

    case "$choice" in
        1)
            echo "=== Installing Web Application (Production Mode) ==="
            ./bin/linux/install.sh production
            ;;

        2)
            update_system_repo
            ;;

        3)
            ./bin/linux/restart.sh
            ;;

        4)
            read -rp "Type 'YES' to confirm full reset: " c
            [[ "$c" == "YES" ]] && ./bin/linux/reset.sh || echo "Cancelled."
            ;;

        5)
            if [[ "$SUSPEND_AVAILABLE" == true ]]; then
                ./bin/linux/suspend.sh
            else
                echo "suspend.sh not available."
            fi
            ;;

        6)
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