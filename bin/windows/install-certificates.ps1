$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path "$ScriptDir\..\.."
$CertsDir = "$ProjectRoot\certs"

Write-Host "🔐 Generating certificates in $CertsDir..."

New-Item -ItemType Directory -Force -Path "$CertsDir\ca", "$CertsDir\nginx", "$CertsDir\backend", "$CertsDir\db", "$CertsDir\minio" | Out-Null

# Root CA
Write-Host "Creating Root CA..."
openssl genrsa -out "$CertsDir\ca\rootCA.key" 4096
openssl req -x509 -new -nodes -key "$CertsDir\ca\rootCA.key" -sha256 -days 1825 `
    -out "$CertsDir\ca\rootCA.crt" `
    -subj "/C=CO/ST=Bogota/O=Ingenieria_del_Chorizo/CN=RootCA"

Function New-Cert {
    param($Name, $CN, $SANs)
    $Dir = "$CertsDir\$Name"
    $SANList = ($SANs -join ", ")
    Write-Host "Generating cert for $Name ($CN, SAN=$SANList)"
    openssl genrsa -out "$Dir\$Name.key" 2048
    $Config = "$Dir\$Name.conf"
@"
[req]
distinguished_name = dn
req_extensions = v3_req
prompt = no
[dn]
CN = $CN
[v3_req]
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names
[alt_names]
DNS.1 = $CN
$(for ($i = 0; $i -lt $SANs.Length; $i++) { "DNS.$($i+2) = $($SANs[$i])" })
"@ | Out-File $Config
    openssl req -new -key "$Dir\$Name.key" -out "$Dir\$Name.csr" -config $Config
    openssl x509 -req -in "$Dir\$Name.csr" -CA "$CertsDir\ca\rootCA.crt" -CAkey "$CertsDir\ca\rootCA.key" -CAcreateserial -out "$Dir\$Name.crt" -days 825 -sha256 -extfile $Config -extensions v3_req
    cat "$Dir\$Name.crt" "$Dir\$Name.key" | Out-File "$Dir\$Name.pem" -Encoding ascii
    Remove-Item "$Dir\$Name.csr", "$Config" -Force
}

New-Cert "minio" "minio.local" @("minio", "minio.local")
New-Cert "nginx" "nginx.local" @("nginx.local")
New-Cert "backend" "backend.local" @("backend.local")
New-Cert "db" "db.local" @("db.local")

Write-Host "✅ Certificates generated at: $CertsDir"
