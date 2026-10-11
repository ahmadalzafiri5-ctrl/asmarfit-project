# Schritt 1 fuer Apple ohne Mac: erzeugt einen privaten Schluessel und eine Zertifikatsanforderung (.certSigningRequest).
# Die Anforderung laedst du bei developer.apple.com unter Certificates -> "+" -> Apple Distribution hoch.
# Der private Schluessel bleibt nur auf diesem PC (%USERPROFILE%\.asfit-apple\apple-dist.key) - sichere den Ordner.
$ErrorActionPreference = "Stop"
$openssl = Join-Path $env:ProgramFiles "Git\usr\bin\openssl.exe"
if (-not (Test-Path $openssl)) { $cmd = Get-Command openssl -ErrorAction SilentlyContinue; if ($cmd) { $openssl = $cmd.Source } else { Write-Host "OpenSSL nicht gefunden (kommt mit Git fuer Windows)." -ForegroundColor Red; exit 1 } }
$dir = Join-Path $env:USERPROFILE ".asfit-apple"
New-Item -ItemType Directory -Force $dir | Out-Null
$key = Join-Path $dir "apple-dist.key"
$csr = Join-Path $dir "apple-dist.certSigningRequest"
if (Test-Path $key) { Write-Host ("Schluessel gibt es schon: " + $key + " (wird nicht ueberschrieben)") -ForegroundColor Yellow }
else { & $openssl genrsa -out $key 2048 2>$null; if ($LASTEXITCODE -ne 0) { Write-Host "Schluessel konnte nicht erzeugt werden." -ForegroundColor Red; exit 1 } }
$mail = Read-Host "Deine Apple-ID (E-Mail)"
& $openssl req -new -key $key -out $csr -subj ("/emailAddress=" + $mail + "/CN=ASFIT/C=CH") 2>$null
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $csr)) { Write-Host "Anforderung konnte nicht erzeugt werden." -ForegroundColor Red; exit 1 }
Write-Host ("Fertig: " + $csr) -ForegroundColor Green
Write-Host "Diese Datei bei Apple hochladen: developer.apple.com -> Certificates -> + -> Apple Distribution -> Choose File."
Write-Host "Das fertige Zertifikat (distribution.cer) herunterladen und dann apple-p12.ps1 ausfuehren."
