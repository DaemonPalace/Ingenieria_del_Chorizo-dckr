# ================================================================
# install-certificates.ps1 – Windows SSL setup (Arepabuelas Stack)
# ================================================================
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::ASCII

# --- Paths ---
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path "$ScriptDir\..\.."
$CertsDir = Join-Path $ProjectRoot "certs"

Write-Host "Generating SSL certificates in: $CertsDir"
New-Item -ItemType Directory -Force -Path "$CertsDir\ca", "$CertsDir\nginx", "$CertsDir\backend", "$CertsDir\db", "$CertsDir\minio" | Out-Null

# --- Ensure OpenSSL is available ---
if (-not (Get-Command "openssl" -ErrorAction SilentlyContinue)) {
    $OpenSSLPath = "C:\Program Files\OpenSSL-Win64\bin"
    if (Test-Path $OpenSSLPath) {
        Write-Host "Adding OpenSSL to PATH temporarily..."
        $env:Path += ";$OpenSSLPath"
    }
}

# --- Check for OpenSSL again ---
if (-not (Get-Command "openssl" -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: OpenSSL not found. Install it and add to PATH."
    exit 1
}

# --- Root CA ---
$RootCAKey = "$CertsDir\ca\rootCA.key"
$RootCACrt = "$CertsDir\ca\rootCA.crt"

if (-not (Test-Path $RootCACrt)) {
    Write-Host "Creating Root CA..."
    & openssl genrsa -out $RootCAKey 4096 | Out-Null
    & openssl req -x509 -new -nodes -key $RootCAKey -sha256 -days 1825 `
        -out $RootCACrt -subj "/C=CO/ST=Cundinamarca/L=Chia/O=Arepabuelas/OU=Dev/CN=Arepabuelas Root CA"
    Write-Host "Root CA generated at: $RootCACrt"
} else {
    Write-Host "Root CA already exists, skipping."
}

# --- Function to create a certificate ---
function New-Cert {
    param (
        [string]$Name,
        [string]$CommonName,
        [string[]]$AltNames
    )

    $Dir = Join-Path $CertsDir $Name
    New-Item -ItemType Directory -Force -Path $Dir | Out-Null
    $Key = "$Dir\$Name.key"
    $Csr = "$Dir\$Name.csr"
    $Crt = "$Dir\$Name.crt"
    $Pem = "$Dir\$Name.pem"
    $Conf = "$Dir\$Name.conf"

    Write-Host "Generating certificate for $Name (CN=$CommonName)..."

    # Compose SAN section
    $sanSection = @("[alt_names]")
    $sanSection += "DNS.1 = $CommonName"
    for ($i = 0; $i -lt $AltNames.Length; $i++) {
        $sanSection += "DNS.$($i + 2) = $($AltNames[$i])"
    }

    # Write config file
    $ConfigText = @"
[req]
distinguished_name = dn
req_extensions = v3_req
prompt = no
[dn]
CN = $CommonName
[v3_req]
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names
$($sanSection -join "`n")
"@

    $ConfigText | Out-File -FilePath $Conf -Encoding ascii -Force

    # Generate private key + CSR
    & openssl genrsa -out $Key 2048 | Out-Null
    & openssl req -new -key $Key -out $Csr -config $Conf | Out-Null

    # Sign with Root CA
    & openssl x509 -req -in $Csr -CA $RootCACrt -CAkey $RootCAKey `
        -CAcreateserial -out $Crt -days 825 -sha256 -extfile $Conf -extensions v3_req | Out-Null

    # Merge .crt + .key into .pem (for Node.js, MinIO, etc.)
    Get-Content $Crt, $Key | Out-File $Pem -Encoding ascii -Force

    # Clean up temporary files
    Remove-Item $Csr, $Conf -Force -ErrorAction SilentlyContinue

    Write-Host "Certificate ready: $Crt (CN=$CommonName, SANs: $($AltNames -join ', '))"
}

# --- Generate certs for each service ---
New-Cert "minio"   "minio.local"  @("minio", "localhost", "127.0.0.1")
New-Cert "nginx"   "nginx.local"  @("nginx", "localhost", "127.0.0.1")
New-Cert "backend" "backend.local" @("backend", "localhost", "127.0.0.1")
New-Cert "db"      "db.local"     @("db", "localhost")

# --- Summary ---
Write-Host ""
Write-Host "Certificates generated successfully in: $CertsDir"
Get-ChildItem -Recurse $CertsDir -Include *.crt,*.pem | Select-Object FullName
