#!/usr/bin/env bash
set -euo pipefail
# ------------------------------------------------------------------
# install-certificates.sh – SSL cert generator
# Works when the script is inside ./bin/linux/ (operates on PROJECT_ROOT)
# ------------------------------------------------------------------
# ---- 1. Find the **project root** (same as install.sh) ----
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)" # ./bin/linux
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)" # go up two levels → project root
cd "$PROJECT_ROOT"
ROOT_DIR="$PROJECT_ROOT"
CERTS_DIR="$ROOT_DIR/certs"
# ---- 2. OS Detection -----------------------------------------------
detect_os() {
  if [[ -f /etc/debian_version ]]; then echo "debian"
  elif command -v pacman &>/dev/null && [[ -f /etc/arch-release ]]; then echo "arch"
  else echo "unknown"
  fi
}
OS=$(detect_os)
echo "Detected OS: $OS"
# ---- 3. Generate CA & Certs ----------------------------------------
mkdir -p "$CERTS_DIR/ca" "$CERTS_DIR/nginx" "$CERTS_DIR/backend" "$CERTS_DIR/db" "$CERTS_DIR/minio"
echo "Generating CA in $CERTS_DIR/ca/..."
command -v openssl >/dev/null 2>&1 || { echo "ERROR: OpenSSL not found. Install it (e.g., sudo apt install openssl)."; exit 1; }
openssl genrsa -out "$CERTS_DIR/ca/rootCA.key" 4096
openssl req -x509 -new -nodes -key "$CERTS_DIR/ca/rootCA.key" -sha256 -days 1825 \
  -out "$CERTS_DIR/ca/rootCA.crt" \
  -subj "/C=CO/ST=Bogota/O=Ingenieria_del_Chorizo/CN=RootCA"
echo "Root CA generated: $CERTS_DIR/ca/rootCA.crt"
generate_cert() {
  local NAME=$1; local CN=$2; shift 2; local SANS=("$@")
  local DIR="$CERTS_DIR/$NAME"
  mkdir -p "$DIR"
  openssl genrsa -out "$DIR/$NAME.key" 2048
  local CONFIG="$DIR/$NAME.conf"
  cat > "$CONFIG" <<EOF
[req]
distinguished_name = dn
req_extensions = v3_req
prompt = no
[dn]
CN = $CN
[v3_req]
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
$( [[ ${#SANS[@]} -gt 0 ]] && echo "subjectAltName = @alt_names" && echo "[alt_names]" && for i in "${!SANS[@]}"; do echo "DNS.$((i+1)) = ${SANS[i]}"; done )
EOF
  openssl req -new -key "$DIR/$NAME.key" -out "$DIR/$NAME.csr" -config "$CONFIG"
  openssl x509 -req -in "$DIR/$NAME.csr" -CA "$CERTS_DIR/ca/rootCA.crt" \
    -CAkey "$CERTS_DIR/ca/rootCA.key" -CAcreateserial -out "$DIR/$NAME.crt" \
    -days 825 -sha256 $( [[ ${#SANS[@]} -gt 0 ]] && echo "-extfile $CONFIG -extensions v3_req" )
  cat "$DIR/$NAME.crt" "$DIR/$NAME.key" > "$DIR/$NAME.pem"
  chmod 600 "$DIR/$NAME.key"
  rm -f "$DIR/$NAME.csr" "$CONFIG"
  echo "Generated cert: $DIR/$NAME.crt (CN=$CN, SANs: ${SANS[*]:-none})"
}
generate_cert "minio" "minio.local" "minio" "minio.local"
generate_cert "nginx" "nginx.local" "nginx.local"
generate_cert "backend" "backend.local" "backend.local"
generate_cert "db" "db.local"
# ---- 4. Postgres Permissions ---------------------------------------
DB_DIR="$CERTS_DIR/db"
echo "Setting Postgres permissions on $DB_DIR/db.key..."
sudo chown 999:999 "$DB_DIR/db.key" 2>/dev/null || echo "Warning: Could not change ownership (run as non-root?)"
chmod 600 "$DB_DIR/db.key"
# ---- 5. Trust CA System-Wide (OS-Specific) -------------------------
case "$OS" in
  arch)
    read -p "Trust CA system-wide for Arch? [y/N]: " -r ans
    [[ "$ans" =~ ^[Yy]$ ]] && {
      sudo cp "$CERTS_DIR/ca/rootCA.crt" /etc/ca-certificates/trust-source/anchors/ingenieria_del_chorizo_ca.crt
      sudo trust extract-compat
      echo "CA trusted on Arch Linux."
    } || echo "Skipped Arch CA trust."
    ;;
  debian)
    read -p "Trust CA system-wide for Debian? [y/N]: " -r ans
    [[ "$ans" =~ ^[Yy]$ ]] && {
      sudo cp "$CERTS_DIR/ca/rootCA.crt" /usr/local/share/ca-certificates/ingenieria_del_chorizo_ca.crt
      sudo update-ca-certificates
      echo "CA trusted on Debian/Ubuntu."
    } || echo "Skipped Debian CA trust."
    ;;
  unknown)
    echo "Unknown OS ($OS) – skipping system trust. Manually add $CERTS_DIR/ca/rootCA.crt to your trust store."
    ;;
esac
# ---- 6. Summary ----------------------------------------------------
echo "Certificates ready in: $CERTS_DIR"
echo "Summary:"
echo " - CA: $CERTS_DIR/ca/rootCA.crt"
echo " - MinIO: $CERTS_DIR/minio/minio.crt (CN=minio.local, SAN=minio, minio.local)"
echo " - Nginx: $CERTS_DIR/nginx/nginx.crt"
echo " - Backend: $CERTS_DIR/backend/backend.crt"
echo " - DB: $CERTS_DIR/db/db.crt"