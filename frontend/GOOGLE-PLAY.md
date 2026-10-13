# ASFIT bei Google Play veröffentlichen

Stand der App: Paketname `com.asmarfit.app` (kann nach der ersten Veröffentlichung nie mehr geändert werden), `targetSdk 36`, Versionsnummer zählt der GitHub-Bau selbst hoch.

## Was Google verlangt (in dieser Reihenfolge)

1. **Entwicklerkonto** bei <https://play.google.com/console> anlegen: einmalig etwa 25 US-Dollar, Ausweis-Prüfung. Das machst du selbst (Zahlung und Identität kann ich nicht für dich erledigen).
2. **Test-Pflicht für neue private Konten:** Bevor die App für alle erscheint, muss sie in einem *geschlossenen Test* mit mindestens 12 Testern 14 Tage lang laufen. Die genaue Zahl und Dauer zeigt die Play Console beim Anlegen an, sie ändert sich ab und zu.
2b. **Links öffnen die App (App Links):** Die App ist für `https://asmarfit-project.onrender.com/` registriert (nur die Startseite, nicht die Rechtstexte). Android prüft dafür `https://asmarfit-project.onrender.com/.well-known/assetlinks.json` (liegt in `frontend/public/.well-known/`). Drin steht heute der Fingerabdruck des Debug-Schlüssels; für die Store-Version muss der SHA-256-Fingerabdruck des App-Signaturschlüssels aus der Play Console (*App-Integrität*) dazu. Ohne diesen Eintrag landen Teilen-Links weiter im Browser (Import klappt dort auch, nur eben in der Web-Version).
3. **App Bundle statt APK:** Google nimmt `.aab` an, nicht die Debug-APK. Dafür braucht es einen eigenen *Upload-Schlüssel* (neu erzeugt, nicht der Debug-Schlüssel). Google verwaltet danach den eigentlichen Signaturschlüssel (Play App Signing).
4. **Store-Eintrag:** Name, Kurzbeschreibung (80 Zeichen), lange Beschreibung, Symbol 512×512, Titelbild 1024×500, mindestens 2 Handy-Bilder, Kategorie „Gesundheit & Fitness", Kontakt-E-Mail.
5. **Datenschutzerklärung als Web-Adresse:** `https://asmarfit-project.onrender.com/privacypolicy.html`. Vorher die Platzhalter für Name, Adresse, E-Mail und Datum in `frontend/public/privacypolicy.html` (und Impressum / Nutzungsbedingungen in der App) ausfüllen.
6. **Fragebögen in der Play Console:**
   - *Datensicherheit:* Was die App sammelt (Mahlzeiten, Gewicht, Training liegen lokal auf dem Handy; Fotos und Texte gehen für die KI-Funktionen an den ASFIT-Server; keine Werbung, kein Verkauf von Daten).
   - *Gesundheitsdaten (Health Connect):* Die App liest nur Schritte, Gewicht und Training. Google verlangt dafür eine Begründung pro Berechtigung.
   - *Inhaltseinstufung* und *Zielgruppe* (18+ ist am einfachsten).
   - *KI-Inhalte:* Apps mit KI-Antworten brauchen eine Möglichkeit, unpassende Antworten **in der App zu melden**. Das ist der Knopf „Antwort melden" unter jeder KI-Antwort (fertig).
7. **Reihenfolge der Tests:** erst *interner Test* (bis 100 Personen, sofort verfügbar, ohne Prüfung), dann *geschlossener Test* (die 14 Tage), dann *Produktion*. Die erste Prüfung durch Google dauert meist einige Tage.

## Was einmalig mit deiner jetzigen Android-App passiert

Die Play-Version ist mit einem anderen Schlüssel signiert als deine Debug-APK. Android lässt kein Überinstallieren zu: **einmal deinstallieren und aus dem Play Store neu installieren.** Vorher in der App per CSV-Export sichern, was du behalten willst (Mahlzeiten, Körperdaten, Training).

Danach laufen Updates ganz normal über den Play Store, solange die Versionsnummer steigt (macht der Bau automatisch).

## Kosten und Nebenpunkte

- Play-Konto: einmalig ca. 25 US-Dollar.
- ElevenLabs: die mitgelieferten Sprachclips dürfen kommerziell nur mit einem bezahlten ElevenLabs-Tarif verwendet werden. Vor der Veröffentlichung prüfen.
- Der Render-Server im kostenlosen Tarif schläft nach Leerlauf ein. Die erste KI-Anfrage dauert dann einige Sekunden. Für echte Nutzer lohnt sich später der bezahlte Tarif.
- Der Bau „für den Store" blendet die Nahrungsergänzungs-Funktion aus (`VITE_HIDE_INTAKE=1`, in GitHub Actions als Eingabe `store` beim manuellen Start). Diese Variante für die Einreichung verwenden.

## Was ich vorbereiten kann

1. Einen zweiten GitHub-Workflow `android-release.yml`, der ein signiertes `.aab` baut (du erzeugst den Upload-Schlüssel mit einem Skript, genau wie beim Debug-Schlüssel, ohne dass ein Passwort im Chat landet).
2. Den „Antwort melden"-Knopf für Coach und Rezepte.
3. Texte für den Store-Eintrag (DE/EN) und die Antworten für den Datensicherheits-Fragebogen.

## Google-Prüfung: was dafür eingebaut ist

Google prüft automatisch (Bundle, Berechtigungen, Ziel-API, 16-KB-Seiten) und von Hand (Richtlinien, Datensicherheit, Health Connect). Prüfung vor dem Hochladen: `node play-review-check.cjs` in `asfit-shots` (baut nichts, liest Manifest, Gradle, Bundle-Lauf und Dokumente; mit einer frischen Debug-APK prüft es zusätzlich die fertigen Berechtigungen und die 16-KB-Ausrichtung).

| Anforderung | Was Google will | In ASFIT |
| --- | --- | --- |
| Ziel-API | neue Apps ab API 35 (Android 15), seit 2025 | `targetSdk 36`, `compileSdk 36`, Android Gradle Plugin 8.13 |
| 16-KB-Speicherseiten | Pflicht für Android-15-Ziel seit Nov. 2025 | AGP ≥ 8.5 richtet die Bibliotheken aus; ML Kit Barcode 17.3.0 ist 16-KB-fähig; `zipalign -c -P 16` meldet alle .so als OK |
| App Bundle, signiert | `.aab` mit Upload-Schlüssel, steigende versionCode | Lauf „Android-Store-Bundle bauen" (versionCode 1000 + Laufnummer, Store-Variante ohne Einnahme-Tagebuch) |
| Berechtigungen | nur was die App nutzt | Kamera (Barcode, Foto), Mitteilungen, Internet; von den 47 Health-Connect-Rechten des Plugins bleiben nur READ_STEPS, READ_WEIGHT, READ_EXERCISE (Rest per `tools:node="remove"`); `SCHEDULE_EXACT_ALARM` entfernt; keine Standort-, Kontakt- oder Medien-Rechte (Fotos über den System-Auswahldialog) |
| Health Connect | Erklärung vor dem Zugriff, Datenschutz-Link aus dem Berechtigungsdialog, Begründung pro Recht im Formular | Verbindungen-Seite erklärt vorher, was gelesen wird; das Plugin liefert `PermissionsRationaleActivity` (Android 13) und den `VIEW_PERMISSION_USAGE`-Alias (Android 14+), die die mitgelieferte `privacypolicy.html` zeigen; Datenschutzerklärung hat den Abschnitt „Gesundheitsdaten"; Begründungen stehen in `store/formulare.md` |
| Nutzerdaten-Richtlinie | Zustimmung, Datenschutzerklärung in der App und im Eintrag | Zustimmungszeile im Willkommensschritt mit Nutzungsbedingungen und Datenschutz in der App, Link im Store-Eintrag |
| KI-generierte Inhalte | Melden in der App, keine verbotenen Inhalte | „Antwort melden" unter jeder KI-Antwort (`/api/report`), Coach lehnt Dosierungen/Zyklen ab |
| Gesundheits-Apps-Erklärung | Kategorie und Funktionen angeben | Fitness und Wellness: Ernährung, Training, Gewicht; keine Diagnose, keine Medizinprodukt-Funktion; Einnahme-Tagebuch nicht im Store-Build |
| Zielgruppe und Inhalt | Altersgruppen, Familienrichtlinie | Zielgruppe „18 und älter" (keine Familien-Pflichten); App selbst ab 16 laut Nutzungsbedingungen mit Prüfung im Onboarding |
| Irreführung / Platzhalter | fertige Rechtstexte, echte Screenshots | `legal.json` + `node tools/fill-legal.cjs`; Screenshots aus der App (`ASFIT-Store`) |
| App Links | assetlinks.json mit dem Signaturschlüssel | Debug-Schlüssel drin; Play-App-Signaturschlüssel nachtragen (Schritt 2b oben) |
| Werbe-ID, Finanzfunktionen, Nachrichten-App, staatliche App | Erklärungen in „App-Inhalte" | alle „Nein" |

## Checkliste vor dem Hochladen

1. `frontend/legal.json` füllen, `node tools/fill-legal.cjs`, committen (die mitgelieferte Datenschutzseite wird auch aus dem Health-Connect-Dialog heraus gezeigt).
2. Upload-Schlüssel erzeugen, Secrets setzen, Lauf „Android-Store-Bundle bauen" starten, `.aab` herunterladen.
3. Play Console → App-Inhalte: Datensicherheit, Gesundheits-Apps, Health Connect (Begründungen), Inhaltseinstufung, Zielgruppe 18+, Werbe-ID nein, KI-Inhalte ja mit Meldefunktion, Datenschutz-URL, App-Zugriff „alle Funktionen ohne Anmeldung" plus die Prüfnotiz aus `store/formulare.md`.
4. Store-Eintrag: Texte aus `store/store-texte.md`, Symbol, Titelbild, Screenshots.
5. Interner Test → geschlossener Test (12 Tester, 14 Tage) → Produktion. Erst nach dem ersten Upload den App-Signaturschlüssel-Fingerabdruck in `assetlinks.json` eintragen und deployen.
6. Render-Backend für die Prüfzeit auf *Starter*, damit der Coach beim Prüfer sofort antwortet.
