# ================================================================
# install-certificates.ps1 – Windows SSL setup (Arepabuelas Stack)
# Compatible con PowerShell 5/7 y UTF-8 sin BOM
# ================================================================
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path "$ScriptDir\..\.."
$CertsDir = Join-Path $ProjectRoot "certs"

Write-Host "Generating SSL certificates in: $CertsDir"
New-Item -ItemType Directory -Force -Path "$CertsDir\ca", "$CertsDir\nginx", "$CertsDir\backend", "$CertsDir\db", "$CertsDir\minio" | Out-Null

# --- Check for OpenSSL ---
if (-not (Get-Command "openssl" -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: OpenSSL not found. Install it and add to PATH."
    exit 1
}

# --- Root CA ---
$RootCAKey = "$CertsDir\ca\rootCA.key"
$RootCACrt = "$CertsDir\ca\rootCA.crt"

if (-not (Test-Path $RootCAKey -and (Test-Path $RootCACrt))) {
    Write-Host "Creating Root CA..."
    & openssl genrsa -out $RootCAKey 4096
    & openssl req -x509 -new -nodes -key $RootCAKey -sha256 -days 1825 `
        -out $RootCACrt -subj "/C=CO/ST=Cundinamarca/L=Chia/O=Arepabuelas/OU=Dev/CN=Arepabuelas Root CA"
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
    $Key = "$Dir\$Name.key"
    $Csr = "$Dir\$Name.csr"
    $Crt = "$Dir\$Name.crt"
    $Pem = "$Dir\$Name.pem"
    $Conf = "$Dir\$Name.conf"

    if (Test-Path $Crt) {
        Write-Host "Certificate for $Name already exists, skipping."
        return
    }

    Write-Host "Generating certificate for $Name (CN=$CommonName)..."

    # Create OpenSSL config dynamically
    $sanLines = ""
    for ($i = 0; $i -lt $AltNames.Length; $i++) {
        $sanLines += "DNS.$($i + 2) = $($AltNames[$i])`n"
    }

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
[alt_names]
DNS.1 = $CommonName
$sanLines
"@

    $ConfigText | Out-File -FilePath $Conf -Encoding ascii -Force

    # Generate private key and CSR
    & openssl genrsa -out $Key 2048
    & openssl req -new -key $Key -out $Csr -config $Conf

    # Sign with Root CA
    & openssl x509 -req -in $Csr -CA $RootCACrt -CAkey $RootCAKey `
        -CAcreateserial -out $Crt -days 825 -sha256 -extfile $Conf -extensions v3_req

    # Combine into PEM for Node.js/MinIO use
    Get-Content $Crt, $Key | Out-File $Pem -Encoding ascii

    # Clean up intermediate files
    Remove-Item $Csr, $Conf -Force
}

# --- Create service certificates ---
New-Cert "nginx"   "localhost" @("nginx", "localhost", "127.0.0.1")
New-Cert "backend" "backend"  @("backend", "localhost")
New-Cert "db"      "db"       @("db", "localhost")
New-Cert "minio"   "minio"    @("minio", "localhost")

Write-Host ""
Write-Host "Certificates generated successfully in: $CertsDir"
Get-ChildItem -Recurse "$CertsDir" -Include *.crt | Select-Object FullName
