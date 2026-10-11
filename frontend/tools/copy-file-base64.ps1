# Kopiert eine beliebige Datei als Text (Base64) in die Zwischenablage, fuer GitHub-Secrets wie
# APPLE_PROFILE_BASE64 (.mobileprovision) oder APPSTORE_API_KEY_P8_BASE64 (.p8). Der Inhalt wird nicht angezeigt.
# Aufruf: powershell -ExecutionPolicy Bypass -File copy-file-base64.ps1 "C:\Users\...\Downloads\ASFIT_App_Store.mobileprovision"
param([Parameter(Mandatory = $true)][string]$datei)
if (-not (Test-Path $datei)) { Write-Host ("Nicht gefunden: " + $datei) -ForegroundColor Red; exit 1 }
$text = [Convert]::ToBase64String([IO.File]::ReadAllBytes($datei))
Set-Clipboard -Value $text
Write-Host ("Fertig: " + $text.Length + " Zeichen liegen in der Zwischenablage. Jetzt bei GitHub als Secret-Wert mit Strg+V einfuegen.") -ForegroundColor Green
