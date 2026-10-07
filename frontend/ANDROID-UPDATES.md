# Wie Updates bei ASFIT ankommen

## Was sich wo aktualisiert

| Was du änderst | Web / iPhone-Home-Bildschirm | Android-App |
| --- | --- | --- |
| Server (KI, Lebensmittel-Katalog, Limits) in `backend/` | sofort nach dem Render-Deploy | sofort, gleicher Server |
| Aussehen und Funktionen in `frontend/` | Render baut neu (2-3 Min.). Beim nächsten Öffnen oder Zurückkehren in die App erscheint oben **„Neue Version verfügbar – Aktualisieren"** | **neue APK nötig**: die App trägt eine eigene Kopie der Seiten in sich |

Der Jahreszeiten-Look rechnet nach dem Datum auf dem Handy selbst. Er braucht kein Update, um von Halloween auf Weihnachten zu wechseln. Nur das **App-Symbol** auf dem Startbildschirm bleibt immer gleich (das lässt Android nicht ohne Weiteres wechseln).

## Android automatisch bauen

`.github/workflows/android-apk.yml` baut bei jedem Push, der `frontend/` ändert, eine APK. Du findest sie auf GitHub unter **Actions → letzter Lauf → Artifacts → ASFIT-android-apk** (Download braucht GitHub-Login, Dauer ca. 6-10 Min.). Zip entpacken, APK auf dem Handy öffnen, „Aktualisieren" tippen.

Die Versionsnummer zählt der Lauf selbst hoch (`1.0.<Lauf>`, versionCode = 100 + Lauf).

### Einmalig: gleiche Signatur wie deine bisherigen APKs

Android installiert eine neue APK nur über die alte, wenn beide mit demselben Schlüssel signiert sind. Deine bisherigen Debug-APKs hat dein PC mit `C:\Users\<Name>\.android\debug.keystore` signiert. Damit der Bau-Server denselben Schlüssel nutzt:

1. In PowerShell auf deinem PC dieses Skript **ausführen** (es kopiert den Schlüssel in die Zwischenablage und schreibt nur „Fertig: … Zeichen"):

   ```powershell
   powershell -ExecutionPolicy Bypass -File "C:\Users\StartKlar\Downloads\asmarfit-project\frontend\tools\copy-keystore-to-clipboard.ps1"
   ```

   Es muss „Fertig: etwa 3400 Zeichen" erscheinen.

2. GitHub → dein Repository → **Settings → Secrets and variables → Actions → New repository secret** (oder beim vorhandenen `DEBUG_KEYSTORE_BASE64` auf **Update**)
3. Name: `DEBUG_KEYSTORE_BASE64`, Wert: einfügen (Strg+V) → speichern.

**Häufiger Fehler:** den Befehl selbst statt seines Ergebnisses einfügen. Dann hat das Secret nur etwa 100 Zeichen. Der Android-Bau meldet das als Warnung („Länge … Zeichen") und baut trotzdem weiter, aber mit einem neuen Schlüssel.

Den Wert niemandem schicken und nirgends einfügen (auch nicht in den Chat). Ohne dieses Secret läuft der Bau trotzdem, die APK hat dann aber bei jedem Lauf einen neuen Schlüssel und lässt sich nur nach Deinstallieren der alten App installieren (Daten vorher über „Backup" in den Einstellungen sichern).

## Store-Variante ohne Einnahme-Tagebuch

Für eine Veröffentlichung im Play Store lässt sich das Einnahme-Tagebuch komplett ausblenden (keine Karte, keine Kachel, keine Einstellung, keine Erinnerung). Auf GitHub: **Actions → Android-App bauen → Run workflow → Haken bei „Store-Variante bauen“**. Auf dem eigenen PC: vor dem Bauen `$env:VITE_HIDE_INTAKE = "1"` setzen. Die normale App behält es.

## Auf dem eigenen PC bauen

```powershell
cd frontend
npm run build
npx cap sync android
cd android
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
.\gradlew.bat assembleDebug
```

Die APK liegt danach in `frontend/android/app/build/outputs/apk/debug/app-debug.apk`.

## Später: Play Store

Über den Play Store aktualisiert sich die App auf allen Handys automatisch. Dafür braucht es ein Entwicklerkonto (einmalig 25 $), eine signierte Release-Datei (AAB) mit eigenem Release-Schlüssel, Datenschutzerklärung, Angaben zu den Daten (Data Safety) und eine Begründung für die Gesundheitsberechtigungen. Das ist ein eigener Schritt; die hier eingerichtete Bau-Strecke ist dafür die Grundlage.
