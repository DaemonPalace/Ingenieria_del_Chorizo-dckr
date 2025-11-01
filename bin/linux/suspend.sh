#!/usr/bin/env bash
set -euo pipefail

docker compose down
echo "Containers stopped (data preserved)."
