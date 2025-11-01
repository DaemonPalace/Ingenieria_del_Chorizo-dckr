#!/bin/bash
set -e

# ==============================
# SSL certificate generator
# For local Docker Compose stack
# With SAN (Subject Alternative Name) support
# ==============================

# Root working directory
ROOT_DIR="$(pwd)"
CERTS_DIR="$ROOT_DIR/certs"

# Create base directories
mkdir -p "$CERTS_DIR/ca" "$CERTS_DIR/nginx" "$CERTS_DIR/backend" "$CERTS_DIR/db" "$CERTS_DIR/minio"

echo "Generating local Certificate Authority (CA)..."

# Generate root CA key and certificate
openssl genrsa -out "$CERTS_DIR/ca/rootCA.key" 4096
openssl req -x509 -new -nodes -key "$CERTS_DIR/ca/rootCA.key" -sha256 -days 1825 \
  -out "$CERTS_DIR/ca/rootCA.crt" \
  -subj "/C=CO/ST=Bogota/L=Bogota/O=Ingenieria_del_Chorizo/OU=RootCA/CN=Ingenieria_del_Chorizo_CA"

echo "Root CA generated: $CERTS_DIR/ca/rootCA.crt"

# ==============================
# Enhanced generate_cert with SAN support
# Usage: generate_cert <name> <CN> [SAN1] [SAN2]...
# ==============================
generate_cert() {
  local NAME=$1
  local DIR="$CERTS_DIR/$NAME"
  local CN=$2
  shift 2
  local SANS=("$@")  # Remaining args are SANs

  echo "Generating certificate for $NAME (CN=$CN, SANs: ${SANS[*]:-none})..."

  # Create directory
  mkdir -p "$DIR"

  # Generate private key
  openssl genrsa -out "$DIR/$NAME.key" 2048

  # Build OpenSSL config with SANs
  local CONFIG_FILE="$DIR/$NAME.conf"
  cat > "$CONFIG_FILE" <<EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no
x509_extensions = v3_req

[req_distinguished_name]
CN = $CN

[v3_req]
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
$(if [ ${#SANS[@]} -gt 0 ]; then
  echo "subjectAltName = @alt_names"
  echo ""
  echo "[alt_names]"
  for i in "${!SANS[@]}"; do
    echo "DNS.$((i+1)) = ${SANS[i]}"
  done
fi)
EOF

  # Generate CSR
  openssl req -new -key "$DIR/$NAME.key" -out "$DIR/$NAME.csr" -config "$CONFIG_FILE"

  # Sign certificate with CA (include SAN extensions if any)
  local EXT_ARG=""
  if [ ${#SANS[@]} -gt 0 ]; then
    EXT_ARG="-extfile $CONFIG_FILE -extensions v3_req"
  fi

  openssl x509 -req -in "$DIR/$NAME.csr" \
    -CA "$CERTS_DIR/ca/rootCA.crt" -CAkey "$CERTS_DIR/ca/rootCA.key" -CAcreateserial \
    -out "$DIR/$NAME.crt" -days 825 -sha256 $EXT_ARG

  # Combine into .pem (for nginx/minio)
  cat "$DIR/$NAME.crt" "$DIR/$NAME.key" > "$DIR/$NAME.pem"

  # Set permissions
  chmod 600 "$DIR/$NAME.key"

  # Clean up
  rm -f "$DIR/$NAME.csr" "$CONFIG_FILE"

  echo "Certificate generated: $DIR/$NAME.crt"
}

# ==============================
# Generate certificates
# ==============================

# MinIO: Needs both minio.local (external) and minio (Docker internal)
generate_cert "minio" "minio.local" "minio" "minio.local"

# Nginx: external access
generate_cert "nginx" "nginx.local" "nginx.local"

# Backend: internal + external
generate_cert "backend" "backend.local" "backend.local"

# DB: internal only
generate_cert "db" "db.local"

# ==============================
# Postgres permissions
# ==============================
DB_DIR="$CERTS_DIR/db"
echo "Setting Postgres permissions on $DB_DIR/db.key..."
sudo chown 999:999 "$DB_DIR/db.key" 2>/dev/null || echo "Warning: Could not change ownership (normal in some environments)"
chmod 600 "$DB_DIR/db.key"

# ==============================
# Optional: Trust CA system-wide (Linux)
# ==============================
echo
read -p "Do you want to trust the local CA system-wide? [y/N]: " -r CONFIRM
if [[ $CONFIRM =~ ^[Yy]$ ]]; then
  sudo cp "$CERTS_DIR/ca/rootCA.crt" /usr/local/share/ca-certificates/ingenieria_del_chorizo_ca.crt
  sudo update-ca-trust
  echo "Local CA added to system trust store."
else
  echo "Skipped adding CA to system trust store."
fi

echo
echo "All certificates generated successfully!"
echo "Certificates are ready in: $CERTS_DIR"
echo
echo "Summary:"
echo "  - CA:        $CERTS_DIR/ca/rootCA.crt"
echo "  - MinIO:     $CERTS_DIR/minio/minio.crt (CN=minio.local, SAN=minio, minio.local)"
echo "  - Nginx:     $CERTS_DIR/nginx/nginx.crt"
echo "  - Backend:   $CERTS_DIR/backend/backend.crt"
echo "  - DB:        $CERTS_DIR/db/db.crt"
