# ASFIT in den App Store (Apple) und in Google Play bringen

Kurzfassung: Google Play geht von deinem Windows-PC aus. Für Apple braucht es ein Apple-Entwicklerkonto und einen Mac zum Bauen, oder wir bauen auf GitHub (dort gibt es Mac-Rechner). Beides erledigt sich nicht an einem Tag; die Prüfung durch Apple und Google dauert jeweils Tage.

## Was bei beiden gleich ist

| Punkt | Stand | Wer macht es |
| --- | --- | --- |
| Paketname `com.asfit.app` | fertig, darf nie mehr geändert werden | – |
| App-Symbol 512×512, App-Name „ASFIT" | fertig (`public/icon-512.png`) | – |
| Datenschutzerklärung als Web-Adresse | fertig ausgefüllt und live: `https://asmarfit-project.onrender.com/privacypolicy.html` | – |
| Impressum und Nutzungsbedingungen | fertig ausgefüllt und live (Martin Urs AS Web&App development, Kloten) | – |
| ASFIT Premium (Abo-Screen) | **Achtung: Kauf-Knopf schaltet noch ohne Zahlung frei.** Vor dem Einreichen entweder Google Play Billing / StoreKit anbinden oder den Premium-Screen vorerst ausblenden — Apple lehnt Schein-Kaufflüsse ab | Claude, auf Zuruf |
| Store-Texte (Kurzbeschreibung, lange Beschreibung, Stichwörter) DE/EN | fertig: `frontend/store/store-texte.md` | – |
| Bildschirmfotos vom Handy (je Store eigene Größen) | fertig: `C:\Users\StartKlar\Downloads\ASFIT-Store\` → `de`/`en` mit `apple-6.7` (1290×2796), `apple-6.5` (1242×2688), `google-phone` (1080×2160), `google-feature-1024x500.png`. Neu erzeugen: `node store-shots.cjs de` und `node store-frames.cjs de` in `asfit-shots` | – |
| „Antwort melden"-Knopf für KI-Antworten | fertig (unter jeder KI-Antwort; Meldungen stehen im Server-Protokoll bei Render, Leseroute mit `REPORT_ADMIN_KEY`) | – |
| Formular-Antworten (Datensicherheit, App-Datenschutz, HealthKit-Texte) | fertig: `frontend/store/formulare.md` | – |
| Gesundheitsdaten: nur Schritte, Gewicht, Training lesen | fertig | – |
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
3. **Play App Signing:** Beim ersten Hochladen des Bundles in der Play Console „Google verwaltet den Signaturschlüssel" wählen. Dein Upload-Schlüssel bleibt der Schlüssel, mit dem du Updates hochlädst. Danach in der Play Console unter *Einrichten → App-Integrität → App-Signatur* den **SHA-256-Fingerabdruck des App-Signaturschlüssels** kopieren und in `frontend/public/.well-known/assetlinks.json` als zweiten Eintrag in `sha256_cert_fingerprints` eintragen (der erste ist der Debug-Schlüssel). Erst damit öffnen Teilen-Links (`https://asmarfit-project.onrender.com/#s=…`) die Store-Version der App statt den Browser.
4. **Play Console ausfüllen:** Store-Eintrag, Datensicherheit, Gesundheits-Berechtigungen (Health Connect) mit Begründung, Inhaltseinstufung, Zielgruppe (18+ ist am einfachsten), KI-Inhalte.
5. **Tests:** interner Test (sofort, bis 100 Personen), dann geschlossener Test. Neue private Konten müssen etwa 12 Tester 14 Tage lang dabeihaben, bevor die App für alle freigegeben wird. Die Console zeigt dir die genaue Zahl.
6. **Deine jetzige App:** einmal deinstallieren, aus dem Store neu installieren, weil die Signatur anders ist. Vorher CSV-Export in der App.

Details stehen in `GOOGLE-PLAY.md`.

## Apple App Store (iPhone)

Das Wichtigste vorweg: Apple-Apps lassen sich nur auf einem Mac bauen und hochladen. Du hast keinen Mac, deshalb bauen wir auf GitHub. Dort gibt es Mac-Rechner, für ein öffentliches Repository ohne Zusatzkosten.

1. **Apple Developer Program:** <https://developer.apple.com/programs/>, 99 US-Dollar **pro Jahr**, Apple-ID mit Zwei-Faktor, Ausweisprüfung, 1 bis 2 Tage Wartezeit. Machst du selbst.
2. **iPhone-Projekt anlegen:** Ich füge `@capacitor/ios` hinzu und lege den `ios`-Ordner an. Das geht auf dem GitHub-Mac, nicht auf deinem PC.
3. **Zertifikate und Profile (Klickliste, sobald das Konto freigeschaltet ist):**
   1. <https://developer.apple.com/account> → Identifiers → „+" → App IDs → Bundle ID `com.asfit.app` (Explicit), Capabilities: **HealthKit** anhaken → Register.
   2. Certificates → „+" → **Apple Distribution**. Dafür brauchst du eine Zertifikatsanforderung (.certSigningRequest). Ohne Mac geht das mit OpenSSL in PowerShell; ich gebe dir den Befehl, wenn es so weit ist. Das fertige Zertifikat (.cer) plus dein privater Schlüssel ergeben eine `.p12`-Datei mit Passwort.
   3. Profiles → „+" → **App Store Connect** → App ID `com.asfit.app` → dein Zertifikat → Name z. B. „ASFIT App Store" → Download (`.mobileprovision`).
   4. <https://appstoreconnect.apple.com> → Users and Access → **Integrations → App Store Connect API** → Team Keys → „+" → Name „GitHub", Zugriff „App Manager" → Download der `.p8`-Datei (nur einmal möglich). Notiere Key ID und Issuer ID.
   5. App Store Connect → Apps → „+" → Name ASFIT, Bundle ID `com.asfit.app`, SKU `asfit`.
   6. GitHub → Settings → Secrets and variables → Actions → New repository secret, je einmal: `APPLE_TEAM_ID` (10 Zeichen, steht oben rechts im Developer-Konto), `APPLE_CERT_P12_BASE64` (Inhalt der .p12 als Text, Skript folgt), `APPLE_CERT_PASSWORD`, `APPLE_PROFILE_BASE64` (.mobileprovision als Text), `APPSTORE_API_KEY_ID`, `APPSTORE_API_ISSUER_ID`, `APPSTORE_API_KEY_P8_BASE64` (.p8 als Text). Für die „als Text"-Werte gibt es ein Skript wie beim Android-Schlüssel; die Werte sehe ich nie.
4. **GitHub-Lauf „iPhone-App bauen" (fertig eingerichtet):** Beim ersten Mal legt er den Ordner `frontend/ios` an (CocoaPods, Berechtigungstexte für Kamera, Fotos und Apple Health, HealthKit-Entitlement, iOS 15.5) und schreibt ihn ins Repository. Jeder Lauf baut unsigniert zur Probe; sind die Secrets da, baut er zusätzlich das signierte Archiv und lädt es zu App Store Connect hoch (erscheint dann unter TestFlight).
5. **TestFlight:** Nach dem Hochladen installierst du die App über die TestFlight-App auf deinem iPhone. Das ersetzt die heutige Variante „Web-App auf dem Home-Bildschirm".
6. **App Store Connect ausfüllen:** Name, Untertitel, Beschreibung, Stichwörter, Bildschirmfotos für 6,7-Zoll- und 6,5-Zoll-iPhones, Altersfreigabe, Datenschutz-Angaben („App Privacy"), Support-Adresse, Datenschutz-Link. Gesundheitsdaten laufen auf dem iPhone über HealthKit (dasselbe Plugin), Apple verlangt dafür Klartext-Begründungen in der App, die ich eintrage.
7. **Einreichen:** Prüfung durch Apple dauert meist 1 bis 3 Tage. Häufige Ablehngründe, die wir vorher abhaken: fehlende Datenschutz-Angaben, Gesundheitsdaten ohne Erklärung, Platzhalter-Texte, Abstürze beim ersten Start, KI-Inhalte ohne Melden-Funktion.

## Kosten auf einen Blick

- Google Play: einmalig ca. 25 US-Dollar.
- Apple: 99 US-Dollar jedes Jahr.
- Render-Server für echte Nutzer: ab ca. 7 US-Dollar im Monat (optional, sonst schläft er ein).
- ElevenLabs für die Stimmen: bezahlter Tarif nötig, sobald die App verkauft oder öffentlich angeboten wird.

## Rechtstexte ausfüllen (30 Platzhalter mit einem Befehl)

1. `frontend/legal.json` öffnen und die Felder füllen: `name`, `strasse`, `plz`, `ort`, `land`, `email`, `telefon` (darf leer bleiben), `datum` (z. B. „12. Oktober 2026"), `datum_en` („12 October 2026"), `gerichtsstand` (Kanton), optional `verantwortlich`.
2. In PowerShell im Ordner `frontend`:

   ```bash
   node tools/fill-legal.cjs
   ```

   Der Befehl ersetzt die Platzhalter in `impressum.html`, `privacypolicy.html` und `terms.html` (DE und EN) und zeigt, ob etwas offen bleibt (`--check` zeigt nur den Stand). Danach committen; die Seiten sind nach dem Deploy live.

## Reihenfolge, die ich vorschlage

1. Du legst beide Entwicklerkonten an (Google zuerst, Apple parallel beantragen).
2. Ich baue: „Antwort melden"-Knopf, Store-Texte, Bildschirmfotos, Begründungstexte, den signierten Android-Bau.
3. Du füllst die Platzhalter in Datenschutz, Impressum und Nutzungsbedingungen aus (Name, Adresse, E-Mail).
4. Android: interner Test → geschlossener Test → Freigabe.
5. iPhone: GitHub-Mac-Bau → TestFlight → Einreichen.

## Apple-Prüfung: was dafür eingebaut ist

Apple prüft jede App von Hand gegen die *App Store Review Guidelines*. Das sind die Punkte, an denen Fitness-Apps meistens scheitern, und was ASFIT dafür hat (Prüfung mit `node ios-review-check.cjs` und `node review-ui-test.cjs` in `asfit-shots`):

| Richtlinie | Was Apple sehen will | In ASFIT |
| --- | --- | --- |
| 1.4.1 Gesundheit | keine riskanten Gesundheitsratschläge, Hinweis auf Fachpersonen | Arzt-Hinweis im Willkommensschritt und unter „Über", Fasten-Warnung, Kalorien-Untergrenze (1200/1500) plus Warnung bei manuell niedrigerem Ziel, Coach lehnt Dosierungen/Zyklen ab; Einnahme-Tagebuch ist im Store-Build nicht enthalten |
| 1.2 KI-Inhalte | Melden-Funktion, Leitplanken | „Antwort melden" unter jeder KI-Antwort, Themen-Leitplanken im Server-Prompt |
| 2.1 Vollständigkeit | funktioniert beim ersten Start, keine Fehlerseiten | ohne Konto nutzbar, Server-Aufwachen wird abgefangen (Hinweis + zweiter Versuch), verständlicher Offline-Text, Rechtstexte ohne Platzhalter (`legal.json`) |
| 2.3 Metadaten | Screenshots aus der echten App, keine anderen Plattformen | Screenshots aus der App, keine „nur Android"-Texte mehr |
| 2.4.1 / 4.0 iPad, Design | läuft auf allen Zielgeräten sauber | nur iPhone (`TARGETED_DEVICE_FAMILY = 1`), nur Hochformat |
| 4.2 Mindestfunktion | kein blosser Web-Wrapper | Web-Code liegt in der App, dazu Kamera/Barcode, Apple Health, Mitteilungen, offline nutzbar |
| 5.1.1 Datenschutz | Zustimmung, Datenschutzerklärung erreichbar, Zweck jeder Berechtigung | Zustimmungszeile mit Nutzungsbedingungen und Datenschutzerklärung in der App (Onboarding + Einstellungen), HealthKit-/Kamera-/Foto-Texte konkret, ab 16 Jahren (Prüfung im Onboarding) |
| 5.1.2 Tracking | keine Weitergabe, kein Tracking | Privacy-Manifest `PrivacyInfo.xcprivacy` (kein Tracking, Datenarten Nutzerinhalte/Fotos/Gesundheit/Fitness nur für die App-Funktion, Required-Reason-APIs mit Grund), App-Datenschutz-Angaben in `store/formulare.md` |
| HealthKit | nur die Daten, die die App braucht; Privacy-Policy | liest nur Schritte, Gewicht, Trainings; schreibt nichts; Erklärtexte in der Info.plist |
| Export-Compliance | Verschlüsselungs-Frage | `ITSAppUsesNonExemptEncryption = false` (nur HTTPS) |

Die Review-Notizen zum Einfügen und die Checkliste vor dem Einreichen stehen in `store/formulare.md`.

## KI-Paket in den Stores anlegen

Das Premium-Abo enthält pro Monat 60 Coach-Fragen, 40 Foto-Scans, 10 Rezepte, 4 Wochenpläne und 2 Prognosen. Darüber hinaus kaufen Nutzer ein **KI-Paket** (CHF 2.90, einmalig, 60 Tage gültig). Dafür braucht es in jedem Store ein Produkt:

| Store | Produkt | Einstellungen |
| --- | --- | --- |
| Google Play | Produkt-ID `asfit_ai_pack`, Typ **Einmalprodukt (verbrauchbar)** | Name „KI-Paket", Preis CHF 2.90; der Server meldet den Kauf nach der Prüfung als verbraucht, damit es erneut gekauft werden kann |
| Stripe (Web) | Preis einmalig CHF 2.90 | Preis-ID als `STRIPE_PRICE_AI_PACK` bei Render eintragen; Webhook-Ereignis `checkout.session.completed` ist schon abonniert |
| App Store (iPhone) | Produkt-ID `asfit_ai_pack`, Typ **Verbrauchsartikel** | folgt mit der StoreKit-Anbindung des Abos (offen) |

Die Zahlen lassen sich auf dem Server ohne App-Update ändern (`AI_QUOTA_JSON`, `AI_PACK_CREDITS_JSON`, `AI_PACK_CHF`). Paywall-Pflicht von Apple: Preis, Inhalt und Gültigkeit stehen in der App auf der Karte „KI-Kontingent".
