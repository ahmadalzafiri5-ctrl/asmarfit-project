# Schritt 2 fuer Apple ohne Mac: macht aus dem von Apple heruntergeladenen Zertifikat (.cer) und deinem privaten Schluessel
# die .p12-Datei fuer GitHub. OpenSSL fragt selbst nach einem Export-Passwort (merken: Secret APPLE_CERT_PASSWORD).
# Aufruf: powershell -ExecutionPolicy Bypass -File apple-p12.ps1 "C:\Users\...\Downloads\distribution.cer"
param([Parameter(Mandatory = $true)][string]$cer)
$ErrorActionPreference = "Stop"
$openssl = Join-Path $env:ProgramFiles "Git\usr\bin\openssl.exe"
if (-not (Test-Path $openssl)) { $cmd = Get-Command openssl -ErrorAction SilentlyContinue; if ($cmd) { $openssl = $cmd.Source } else { Write-Host "OpenSSL nicht gefunden (kommt mit Git fuer Windows)." -ForegroundColor Red; exit 1 } }
if (-not (Test-Path $cer)) { Write-Host ("Zertifikat nicht gefunden: " + $cer) -ForegroundColor Red; exit 1 }
$dir = Join-Path $env:USERPROFILE ".asfit-apple"
$key = Join-Path $dir "apple-dist.key"
if (-not (Test-Path $key)) { Write-Host "Privater Schluessel fehlt. Zuerst apple-csr.ps1 ausfuehren." -ForegroundColor Red; exit 1 }
$pem = Join-Path $dir "apple-dist.pem"
$p12 = Join-Path $dir "apple-dist.p12"
& $openssl x509 -in $cer -inform DER -out $pem 2>$null
if ($LASTEXITCODE -ne 0) { & $openssl x509 -in $cer -inform PEM -out $pem 2>$null }
if ($LASTEXITCODE -ne 0) { Write-Host "Das Zertifikat liess sich nicht lesen." -ForegroundColor Red; exit 1 }
Write-Host "OpenSSL fragt jetzt zweimal nach einem Export-Passwort fuer die .p12-Datei." -ForegroundColor Cyan
& $openssl pkcs12 -export -inkey $key -in $pem -out $p12 -name "Apple Distribution"
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $p12)) { Write-Host "Die .p12-Datei wurde nicht erzeugt." -ForegroundColor Red; exit 1 }
$text = [Convert]::ToBase64String([IO.File]::ReadAllBytes($p12))
Set-Clipboard -Value $text
Write-Host ("Fertig: " + $p12 + " - " + $text.Length + " Zeichen liegen in der Zwischenablage.") -ForegroundColor Green
Write-Host "GitHub: Secret APPLE_CERT_P12_BASE64 = Strg+V, Secret APPLE_CERT_PASSWORD = das Passwort von eben."
