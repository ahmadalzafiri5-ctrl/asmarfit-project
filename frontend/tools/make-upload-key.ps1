# Erzeugt einmalig den Upload-Schluessel fuer Google Play und kopiert ihn als Text in die Zwischenablage,
# damit du ihn bei GitHub als Secret UPLOAD_KEYSTORE_BASE64 einfuegen kannst (Strg+V).
# Das Passwort fragt keytool selbst ab; es wird weder angezeigt noch gespeichert. Merke es dir und lege es
# bei GitHub als Secret UPLOAD_KEYSTORE_PASSWORD ab. Die Datei liegt danach unter %USERPROFILE%\.android\asfit-upload.jks:
# sichere sie an einem zweiten Ort (ohne sie lassen sich Updates spaeter nur ueber den Google-Support freischalten).
$ErrorActionPreference = "Stop"
$pfad = Join-Path $env:USERPROFILE ".android\asfit-upload.jks"
$keytool = Join-Path $env:ProgramFiles "Android\Android Studio\jbr\bin\keytool.exe"
if (-not (Test-Path $keytool)) {
  $cmd = Get-Command keytool -ErrorAction SilentlyContinue
  if ($cmd) { $keytool = $cmd.Source } else { Write-Host "keytool nicht gefunden (Android Studio oder Java installieren)." -ForegroundColor Red; exit 1 }
}
if (Test-Path $pfad) {
  Write-Host ("Es gibt schon einen Upload-Schluessel: " + $pfad) -ForegroundColor Yellow
  Write-Host "Er wird NICHT ueberschrieben. Nur der Text wird in die Zwischenablage kopiert."
} else {
  New-Item -ItemType Directory -Force (Split-Path $pfad) | Out-Null
  Write-Host "Jetzt fragt keytool zweimal nach einem Passwort (mindestens 6 Zeichen). Beim Schluessel-Passwort einfach Enter druecken (gleich wie das Speicher-Passwort)." -ForegroundColor Cyan
  & $keytool -genkeypair -v -keystore $pfad -alias asfit -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=ASFIT, O=ASFIT, C=CH"
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path $pfad)) { Write-Host "Der Schluessel wurde nicht erzeugt." -ForegroundColor Red; exit 1 }
}
$text = [Convert]::ToBase64String([IO.File]::ReadAllBytes($pfad))
Set-Clipboard -Value $text
Write-Host ("Fertig: " + $text.Length + " Zeichen liegen in der Zwischenablage (richtig sind etwa 3500 bis 4000).") -ForegroundColor Green
Write-Host "Jetzt bei GitHub: Settings > Secrets and variables > Actions > New repository secret:"
Write-Host "  1) Name UPLOAD_KEYSTORE_BASE64, Wert mit Strg+V einfuegen > Add secret"
Write-Host "  2) Name UPLOAD_KEYSTORE_PASSWORD, Wert = dein Passwort von eben > Add secret"
Write-Host ("Danach die Datei sichern: " + $pfad)
