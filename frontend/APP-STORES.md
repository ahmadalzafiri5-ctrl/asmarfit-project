# ASFIT in den App Store (Apple) und in Google Play bringen

Kurzfassung: Google Play geht von deinem Windows-PC aus. Für Apple braucht es ein Apple-Entwicklerkonto und einen Mac zum Bauen, oder wir bauen auf GitHub (dort gibt es Mac-Rechner). Beides erledigt sich nicht an einem Tag; die Prüfung durch Apple und Google dauert jeweils Tage.

## Was bei beiden gleich ist

| Punkt | Stand | Wer macht es |
| --- | --- | --- |
| Paketname `com.asmarfit.app` | fertig, darf nie mehr geändert werden | – |
| App-Symbol 512×512, App-Name „ASFIT" | fertig (`public/icon-512.png`) | – |
| Datenschutzerklärung als Web-Adresse | `https://asmarfit-project.onrender.com/privacypolicy.html`, Platzhalter für Name, Adresse, E-Mail, Datum sind noch leer | du füllst die Platzhalter aus, ich trage sie ein |
| Impressum und Nutzungsbedingungen | Platzhalter wie oben | du |
| Store-Texte (Kurzbeschreibung, lange Beschreibung, Stichwörter) DE/EN | fehlen | ich schreibe sie |
| Bildschirmfotos vom Handy (je Store eigene Größen) | fehlen | ich erzeuge sie aus der App |
| „Antwort melden"-Knopf für KI-Antworten (Coach, Rezepte) | fehlt, Google verlangt ihn, bei Apple hilft er bei der Prüfung | ich baue ihn |
| Gesundheitsdaten: nur Schritte, Gewicht, Training lesen | fertig, Begründungstexte für die Formulare schreibe ich | ich |
| Server im Gratis-Tarif schläft ein (erste KI-Antwort langsam) | für echte Nutzer später bezahlter Tarif | du entscheidest |
| ElevenLabs-Stimmen: kommerzielle Nutzung nur mit bezahltem Tarif | prüfen, bevor die App öffentlich ist | du |

## Google Play (Android), von deinem PC aus

1. **Konto:** <https://play.google.com/console>, einmalig ca. 25 US-Dollar, Ausweisprüfung. Machst du selbst.
2. **Signierter Bau (fertig eingerichtet):** Google will ein App Bundle (`.aab`), keine Debug-APK. Der GitHub-Lauf **„Android-Store-Bundle bauen"** erzeugt es, immer als Store-Variante (ohne Einnahme-Tagebuch). Einmalig musst du den Upload-Schlüssel anlegen:
   1. In PowerShell auf deinem PC ausführen (keytool fragt dich zweimal nach einem Passwort; es wird nirgends gespeichert):

      ```powershell
      powershell -ExecutionPolicy Bypass -File "C:\Users\StartKlar\Downloads\asmarfit-project\frontend\tools\make-upload-key.ps1"
      ```

   2. GitHub → Settings → Secrets and variables → Actions → **New repository secret**: `UPLOAD_KEYSTORE_BASE64` (Wert mit Strg+V aus der Zwischenablage) und `UPLOAD_KEYSTORE_PASSWORD` (dein Passwort von eben).
   3. Die Datei `%USERPROFILE%\.android\asfit-upload.jks` an einem zweiten Ort sichern.
   4. Actions → „Android-Store-Bundle bauen" → **Run workflow**. Unten beim Lauf unter „Artifacts" liegt `ASFIT-android-store-aab`. Ohne die Secrets baut der Lauf nur eine unsignierte Probe.
3. **Play App Signing:** Beim ersten Hochladen des Bundles in der Play Console „Google verwaltet den Signaturschlüssel" wählen. Dein Upload-Schlüssel bleibt der Schlüssel, mit dem du Updates hochlädst.
4. **Play Console ausfüllen:** Store-Eintrag, Datensicherheit, Gesundheits-Berechtigungen (Health Connect) mit Begründung, Inhaltseinstufung, Zielgruppe (18+ ist am einfachsten), KI-Inhalte.
5. **Tests:** interner Test (sofort, bis 100 Personen), dann geschlossener Test. Neue private Konten müssen etwa 12 Tester 14 Tage lang dabeihaben, bevor die App für alle freigegeben wird. Die Console zeigt dir die genaue Zahl.
6. **Deine jetzige App:** einmal deinstallieren, aus dem Store neu installieren, weil die Signatur anders ist. Vorher CSV-Export in der App.

Details stehen in `GOOGLE-PLAY.md`.

## Apple App Store (iPhone)

Das Wichtigste vorweg: Apple-Apps lassen sich nur auf einem Mac bauen und hochladen. Du hast keinen Mac, deshalb bauen wir auf GitHub. Dort gibt es Mac-Rechner, für ein öffentliches Repository ohne Zusatzkosten.

1. **Apple Developer Program:** <https://developer.apple.com/programs/>, 99 US-Dollar **pro Jahr**, Apple-ID mit Zwei-Faktor, Ausweisprüfung, 1 bis 2 Tage Wartezeit. Machst du selbst.
2. **iPhone-Projekt anlegen:** Ich füge `@capacitor/ios` hinzu und lege den `ios`-Ordner an. Das geht auf dem GitHub-Mac, nicht auf deinem PC.
3. **Zertifikate und Profile:** In deinem Apple-Konto entstehen ein Verteilungszertifikat und ein Provisioning-Profil. Beides legst du als GitHub-Secrets ab, zusammen mit einem App-Store-Connect-API-Schlüssel. Ich schreibe dir dafür eine Schritt-für-Schritt-Liste, die Werte selbst sehe ich nie.
4. **GitHub-Lauf für iPhone:** baut die App, signiert sie und lädt sie zu App Store Connect hoch. Ohne die Secrets baut er nur zur Probe (unsigniert), damit wir früh sehen, ob alles kompiliert.
5. **TestFlight:** Nach dem Hochladen installierst du die App über die TestFlight-App auf deinem iPhone. Das ersetzt die heutige Variante „Web-App auf dem Home-Bildschirm".
6. **App Store Connect ausfüllen:** Name, Untertitel, Beschreibung, Stichwörter, Bildschirmfotos für 6,7-Zoll- und 6,5-Zoll-iPhones, Altersfreigabe, Datenschutz-Angaben („App Privacy"), Support-Adresse, Datenschutz-Link. Gesundheitsdaten laufen auf dem iPhone über HealthKit (dasselbe Plugin), Apple verlangt dafür Klartext-Begründungen in der App, die ich eintrage.
7. **Einreichen:** Prüfung durch Apple dauert meist 1 bis 3 Tage. Häufige Ablehngründe, die wir vorher abhaken: fehlende Datenschutz-Angaben, Gesundheitsdaten ohne Erklärung, Platzhalter-Texte, Abstürze beim ersten Start, KI-Inhalte ohne Melden-Funktion.

## Kosten auf einen Blick

- Google Play: einmalig ca. 25 US-Dollar.
- Apple: 99 US-Dollar jedes Jahr.
- Render-Server für echte Nutzer: ab ca. 7 US-Dollar im Monat (optional, sonst schläft er ein).
- ElevenLabs für die Stimmen: bezahlter Tarif nötig, sobald die App verkauft oder öffentlich angeboten wird.

## Reihenfolge, die ich vorschlage

1. Du legst beide Entwicklerkonten an (Google zuerst, Apple parallel beantragen).
2. Ich baue: „Antwort melden"-Knopf, Store-Texte, Bildschirmfotos, Begründungstexte, den signierten Android-Bau.
3. Du füllst die Platzhalter in Datenschutz, Impressum und Nutzungsbedingungen aus (Name, Adresse, E-Mail).
4. Android: interner Test → geschlossener Test → Freigabe.
5. iPhone: GitHub-Mac-Bau → TestFlight → Einreichen.
