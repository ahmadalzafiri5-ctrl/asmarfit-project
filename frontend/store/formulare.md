# Antworten für die Store-Formulare

Was ASFIT wirklich tut, damit die Fragebögen bei Google und Apple richtig ausgefüllt werden. Stand: Oktober 2026.

## Grundlagen, die für alle Antworten gelten

- Kein Nutzerkonto, keine Anmeldung, keine Werbung, kein Verkauf von Daten, keine Tracker, keine Analyse-SDKs.
- Alle Einträge (Mahlzeiten, Gewicht, Training, Notizen, Fotos) liegen nur auf dem Handy (lokaler Speicher). Es gibt kein Cloud-Backup durch uns.
- Der ASFIT-Server (Render) leitet nur bestimmte Anfragen weiter: Lebensmittelsuche, Barcode, KI-Funktionen, Rezept-Import, Übungsvideo-Suche, Meldungen zu KI-Antworten. Er speichert keine Nutzerdaten dauerhaft; Suchergebnisse werden bis zu 6 Stunden zwischengespeichert, Meldungen stehen im Server-Protokoll.
- Drittanbieter, die Daten sehen: Anthropic (KI-Anfragen: Text, bei Foto-Scan und Potenzial-Vorschau das verkleinerte Foto), Open Food Facts und USDA (Suchbegriffe, Barcodes), jsDelivr (lädt Übungsfotos, sieht die IP-Adresse), YouTube-Suche nur per Link im Browser. Bild-Dienst (OpenAI oder Google) nur, wenn der Betreiber einen einrichtet.
- Gesundheitsdaten über Health Connect (Android) und Apple Health (iPhone): nur **lesen** von Schritten, Gewicht und Trainings. Nichts wird geschrieben, nichts verlässt das Handy.

## Google Play: Datensicherheit

| Frage | Antwort |
| --- | --- |
| Erhebt oder teilt die App Nutzerdaten? | Ja (Daten werden an unseren Server gesendet, um Funktionen auszuführen) |
| Werden Daten verschlüsselt übertragen? | Ja (HTTPS) |
| Können Nutzer die Löschung verlangen? | Daten liegen nur lokal; Löschen = App-Daten löschen oder App deinstallieren. Server speichert nichts Zuordenbares (kein Konto). Antwort: „Ja, über Löschen der App-Daten"; Löschanfragen an die Support-Adresse. |
| Datentypen: Gesundheit und Fitness → Gesundheitsinfos | Erhoben: ja (Mahlzeiten, Gewicht, Fasten, Gesundheitsdaten aus Health Connect). Geteilt: nein. Verarbeitung nur auf dem Gerät, außer wenn der Nutzer den KI-Coach mit „Meine Daten teilen" nutzt: dann geht eine Zusammenfassung an unseren Server/Anthropic. Zweck: App-Funktionen. Optional: ja. |
| Datentypen: Gesundheit und Fitness → Fitnessinfos | Erhoben: ja (Training, Schritte). Geteilt: nein. Zweck: App-Funktionen. Optional: ja. |
| Fotos und Videos → Fotos | Erhoben: ja (Mahlzeit-Foto für den Scan, Foto für die Potenzial-Vorschau, Profil-/Fortschrittsfotos lokal). Geteilt: ja, mit Anthropic (und ggf. Bild-Dienst) nur für die vom Nutzer gestartete Funktion. Zweck: App-Funktionen. Optional: ja. |
| Nachrichten → sonstige In-App-Nachrichten | Erhoben: ja (Fragen an den Coach, Rezeptwünsche, Meldungen zu KI-Antworten). Geteilt: ja, mit Anthropic. Zweck: App-Funktionen. Optional: ja. |
| Persönliche Daten (Name, E-Mail, Adresse) | Nicht erhoben (der Vorname im Profil bleibt lokal). |
| Standort | Nicht erhoben (Land wird aus Zeitzone/Sprache erkannt oder gewählt, keine Ortung). |
| App-Aktivität, Geräte-IDs, Kontakte, Kalender | Nicht erhoben. |
| Gesundheitsdaten (Health Connect) im Formular „Gesundheits-Apps" | Gelesene Datentypen: Schritte, Gewicht, Trainingseinheiten. Zweck: Anzeige im Startbildschirm, Kalorienbilanz, Trainingsübersicht. Nicht für Werbung, nicht für Dritte. |

**Begründung der Health-Connect-Berechtigungen (Formular „Health Connect"):**
READ_STEPS: Die App zeigt die Schritte des Tages und rechnet den Kalorienverbrauch in die Bilanz ein. READ_WEIGHT: Die App übernimmt Gewichtseinträge in den Gewichtsverlauf. READ_EXERCISE: Die App zeigt Trainingseinheiten in der Trainingsübersicht. Alles nur lokal, nichts wird geschrieben oder weitergegeben.

**Inhaltseinstufung (IARC-Fragebogen):** keine Gewalt, keine sexuellen Inhalte, kein Glücksspiel, keine Nutzer-Interaktion mit Fremden (Pläne werden nur per Link/Text geteilt), In-App-Käufe nein, Standort nein. Gesundheitsthemen: ja (Ernährung, Fasten, Training). Ergebnis voraussichtlich „Ab 3" bei Google; wir setzen die Zielgruppe trotzdem auf 18+, weil die Potenzial-Vorschau mit Foto nur für Erwachsene ist.

**KI-generierte Inhalte (Google-Richtlinie):** Ja, die App erzeugt Inhalte mit KI (Coach, Rezepte, Wochenplan, Potenzial-Vorschau, Foto-Scan). Nutzer können jede Antwort in der App melden („Antwort melden", geht an unser Server-Protokoll). Die App gibt keine medizinischen Dosierungen und verweist bei Beschwerden an Fachpersonen.

**Anmeldedaten für die Prüfung:** nicht nötig, kein Konto.

## Apple App Store: App-Datenschutz (Nutrition Labels)

- **Gesundheit und Fitness:** Gesundheit (Mahlzeiten, Gewicht, Fasten, Health-Daten), Fitness (Training, Schritte). Verwendung: App-Funktionalität. Mit Nutzer verknüpft: nein (kein Konto). Tracking: nein.
- **Fotos oder Videos:** Verwendung: App-Funktionalität (Foto-Scan, Potenzial-Vorschau). Verknüpft: nein. Tracking: nein.
- **Nutzerinhalte → andere Nutzerinhalte:** Coach-Fragen, Rezeptwünsche, Meldungen. Verwendung: App-Funktionalität. Verknüpft: nein.
- **Kontaktdaten, Standort, Identifikatoren, Kauf, Browserverlauf, Nutzungsdaten, Diagnose:** nicht erhoben.
- **Datenschutzrichtlinie-URL:** https://asmarfit-project.onrender.com/privacypolicy.html

**HealthKit-Texte (Info.plist):**
- NSHealthShareUsageDescription (DE): „ASFIT liest Schritte, Gewicht und Trainings aus Apple Health, um sie im Startbildschirm und in der Kalorienbilanz anzuzeigen." (EN: "ASFIT reads steps, weight and workouts from Apple Health to show them on the home screen and in your calorie balance.")
- NSHealthUpdateUsageDescription: nicht nötig, ASFIT schreibt nichts in Apple Health.
- NSCameraUsageDescription (DE): „Die Kamera scannt Barcodes und fotografiert Mahlzeiten, um Kalorien zu schätzen." (EN: "The camera scans barcodes and photographs meals to estimate calories.")
- NSPhotoLibraryUsageDescription (DE): „Fotos aus der Mediathek für Fortschrittsfotos, Profilbild, Rezeptfoto und die Potenzial-Vorschau." (EN: "Photos from your library for progress photos, profile picture, recipe photo and the potential preview.")

**Altersfreigabe (Apple-Fragebogen):** keine Gewalt, keine sexuellen Inhalte, kein Glücksspiel, keine unbeschränkten Web-Inhalte; medizinische/Behandlungsinfos: „selten/mild" (Ernährungs- und Trainingstipps, Hinweis auf Fachpersonen). Zusätzlich 18+ setzen wegen der Potenzial-Vorschau.

**Prüfhinweise für Apple (Review Notes):** Kein Konto nötig. Die KI-Funktionen brauchen Internet; der Server kann beim ersten Aufruf einige Sekunden brauchen (kostenloser Hosting-Tarif). Health-Daten werden nur gelesen. Jede KI-Antwort hat „Antwort melden".

## Was du vorher eintragen musst (Platzhalter)

- `frontend/public/privacypolicy.html`, `impressum.html`, `terms.html`: Name, Adresse, E-Mail, Datum.
- Support-E-Mail in beiden Stores (dieselbe wie im Impressum).

## Apple App Review: Notizen zum Einfügen

In App Store Connect unter *App-Überprüfungsinformationen → Notizen* (Englisch reicht, Apple prüft auf Englisch). Kein Demo-Konto nötig, Feld „Anmeldung erforderlich" bleibt aus.

**Englisch (einfügen):**

> ASFIT is a fitness and nutrition tracker. No account or login is needed: all data stays on the device. Test flow: open the app → onboarding (any values; the birthday must be 16+) → Home shows calories/macros, "Start workout" and quick actions. Nutrition tab: food search, barcode scan (camera), meal photo (AI estimate), recipes, fast-food planner. Training tab: exercise library with animated figures, plans, workout logging, friends & duel (codes/links shared by the users themselves, no server accounts). Progress tab: weight, photos, muscle ranks. Settings → Connections optionally reads steps, weight and workouts from Apple Health (read only; the app writes nothing). AI features (Coach via the Home quick action, meal photo, recipe import, weekly plan) call our own server, which uses Anthropic's API; every AI answer has a "Report answer" button and the coach refuses medical dosing topics. The server runs on a small hosting plan: the first AI request after a pause can take up to a minute; the app shows "The server is waking up" and retries automatically. Notifications are optional local reminders. No in-app purchases, no ads, no tracking, no third-party logins. Terms, privacy policy and imprint are inside the app (welcome step and Settings → Legal) and at https://asmarfit-project.onrender.com/privacypolicy.html.

**Deutsch (zur Kontrolle, nicht einfügen):** ASFIT ist ein Fitness- und Ernährungs-Tracker ohne Konto; alle Daten bleiben auf dem Gerät. Ablauf: App öffnen → Onboarding (beliebige Werte, Geburtstag 16+) → Start mit Kalorien/Makros, „Training starten" und Schnellaktionen. Ernährung: Suche, Barcode (Kamera), Mahlzeiten-Foto (KI-Schätzung), Rezepte, Fast-Food-Planer. Training: Übungsbibliothek mit Figuren, Pläne, Protokoll, Freunde & Duell (Codes/Links, keine Server-Konten). Fortschritt: Gewicht, Fotos, Muskel-Ränge. Einstellungen → Verbindungen liest optional Schritte, Gewicht, Trainings aus Apple Health (nur lesen). KI-Funktionen laufen über unseren Server (Anthropic-API); jede Antwort hat „Antwort melden", der Coach lehnt Dosierungsfragen ab. Der Server kann nach einer Pause bis zu eine Minute brauchen; die App zeigt „Der Server wacht auf" und versucht es automatisch erneut. Keine Käufe, keine Werbung, kein Tracking, keine Fremd-Logins. Rechtstexte in der App und auf der Website.

**Altersfreigabe (Fragebogen, Stand 2026):** alle Inhaltsfragen „Nein/Keine", nur *Medical/Treatment Information: Infrequent/Mild* (Ernährungs- und Trainingstipps mit Hinweis auf Fachpersonen) → Apple ergibt 12+. Die eigene Regel „ab 16" steht in den Nutzungsbedingungen und wird im Onboarding geprüft; das ist mit 12+ vereinbar. Keine „Unrestricted Web Access"-Angabe (die App öffnet nur Rechtstexte und YouTube-Suche extern). Kein Glücksspiel, keine Wettbewerbe mit Geld.

## Apple-Prüfung: Checkliste vor dem Einreichen

1. `frontend/legal.json` füllen, `node tools/fill-legal.cjs` ausführen, committen. `node ios-review-check.cjs` (in `asfit-shots`) muss „alles gefüllt" melden. Platzhalter sind der häufigste Ablehngrund (Guideline 2.1/2.3).
2. Render-Backend für die Prüfwoche auf *Starter* stellen (sonst schläft der Server; die App fängt das ab, aber ein wacher Server macht den Coach sofort nutzbar).
3. App Store Connect: *App-Datenschutz* genau nach dem Abschnitt oben; *Altersfreigabe* wie oben; *Review-Notizen* einfügen; Support-URL und Datenschutz-URL (`https://asmarfit-project.onrender.com/privacypolicy.html`); Screenshots 6,7″ und 6,5″ aus `C:\Users\StartKlar\Downloads\ASFIT-Store`.
4. HealthKit in der App-ID aktiviert (developer.apple.com → Identifiers), Build enthält das Entitlement (der Lauf prüft das).
5. TestFlight-Build selbst durchspielen: Onboarding bis zum Ende, Coach-Frage, Barcode, Apple Health verbinden, einen Plan teilen, Rechtstexte öffnen. Was dir dabei auffällt, fällt auch Apple auf.
6. Export-Compliance: beantwortet der Upload automatisch mit „nein" (`ITSAppUsesNonExemptEncryption = false`).
7. Bei einer Ablehnung: im *Resolution Center* antworten, Punkt beheben, neuen Build hochladen (Build-Nummer kommt automatisch vom Lauf). Nachfragen von Apple innerhalb von Tagen beantworten, sonst wird die Einreichung geschlossen.

## Google Play: App-Inhalte und Prüfnotiz

**App-Zugriff (App access):** „Alle Funktionen sind ohne Anmeldung verfügbar". Zusätzlich als Anweisung für die Prüfer (Englisch):

> ASFIT needs no account. Onboarding: pick any values (birthday 16+). Home shows calories, "Start workout" and quick actions (Food, Weigh, Coach). Nutrition: search, barcode (camera), meal photo (AI), recipes, fast-food planner. Training: exercise library with animated figures, plans, logging, friends & duel via shared codes. Settings → Connections optionally reads steps, weight and workouts from Health Connect (read only). AI answers come from our server (Anthropic API); each has "Report answer". The first AI request after a pause can take up to a minute (server wakes up), the app shows a hint and retries. No purchases, no ads, no tracking.

**Gesundheits-Apps (Health apps):** Ja, Gesundheitsfunktionen. Kategorie *Fitness und Wellness*: Ernährung/Kalorien, Training, Gewicht, Schritte, Wasser, Fasten-Timer. Keine Diagnose, keine Medizinprodukt-Funktionen, keine klinischen Daten, keine Studien, keine regulierte Gesundheitsleistung. Health Connect: nur lesen (Schritte, Gewicht, Trainingseinheiten).

**Zielgruppe und Inhalt:** Zielgruppe „18 und älter"; nicht für Kinder gestaltet; keine Werbung. (Die App verlangt im Onboarding mindestens 16 Jahre; die Store-Zielgruppe 18+ hält die Familienrichtlinie aus dem Spiel.)

**Werbe-ID:** Nein, die App verwendet keine Werbe-ID. **Finanzfunktionen:** Keine. **Nachrichten-App:** Nein. **Staatliche App:** Nein. **Datenschutzerklärung:** `https://asmarfit-project.onrender.com/privacypolicy.html`.

**Berechtigungen, die Google abfragt:** Kamera (Barcode-Scan, Mahlzeiten-Foto), Mitteilungen (Erinnerungen, nur wenn der Nutzer sie einschaltet). Keine Standort-, Hintergrund-, SMS-, Anruf- oder Dateizugriffs-Rechte. Health-Connect-Rechte: READ_STEPS, READ_WEIGHT, READ_EXERCISE mit den Begründungen oben.

**Testen vor der Freigabe:** Google verlangt für neue private Konten einen geschlossenen Test mit mindestens 12 Testern über 14 Tage; danach den Antrag auf Produktionszugang stellen und die Fragen zur App ehrlich beantworten (Zweck, Zielgruppe, was getestet wurde).
