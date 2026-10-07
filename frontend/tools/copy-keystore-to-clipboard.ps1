# Kopiert deinen Android-Debug-Schluessel als Text in die Zwischenablage, damit du ihn bei GitHub als Wert des Secrets
# DEBUG_KEYSTORE_BASE64 einfuegen kannst (Strg+V). Der Schluessel wird weder angezeigt noch irgendwo gespeichert.
$pfad = Join-Path $env:USERPROFILE ".android\debug.keystore"
if (-not (Test-Path $pfad)) {
  Write-Host ("Nicht gefunden: " + $pfad) -ForegroundColor Red
  exit 1
}
$text = [Convert]::ToBase64String([IO.File]::ReadAllBytes($pfad))
Set-Clipboard -Value $text
Write-Host ("Fertig: " + $text.Length + " Zeichen liegen in der Zwischenablage (richtig sind etwa 3400).") -ForegroundColor Green
Write-Host "Jetzt bei GitHub: Settings > Secrets and variables > Actions > DEBUG_KEYSTORE_BASE64 > Update secret > Wert mit Strg+V einfuegen > Save."
