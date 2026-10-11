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
