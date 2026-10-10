# ASFIT bei Google Play veröffentlichen

Stand der App: Paketname `com.asmarfit.app` (kann nach der ersten Veröffentlichung nie mehr geändert werden), `targetSdk 36`, Versionsnummer zählt der GitHub-Bau selbst hoch.

## Was Google verlangt (in dieser Reihenfolge)

1. **Entwicklerkonto** bei <https://play.google.com/console> anlegen: einmalig etwa 25 US-Dollar, Ausweis-Prüfung. Das machst du selbst (Zahlung und Identität kann ich nicht für dich erledigen).
2. **Test-Pflicht für neue private Konten:** Bevor die App für alle erscheint, muss sie in einem *geschlossenen Test* mit mindestens 12 Testern 14 Tage lang laufen. Die genaue Zahl und Dauer zeigt die Play Console beim Anlegen an, sie ändert sich ab und zu.
3. **App Bundle statt APK:** Google nimmt `.aab` an, nicht die Debug-APK. Dafür braucht es einen eigenen *Upload-Schlüssel* (neu erzeugt, nicht der Debug-Schlüssel). Google verwaltet danach den eigentlichen Signaturschlüssel (Play App Signing).
4. **Store-Eintrag:** Name, Kurzbeschreibung (80 Zeichen), lange Beschreibung, Symbol 512×512, Titelbild 1024×500, mindestens 2 Handy-Bilder, Kategorie „Gesundheit & Fitness", Kontakt-E-Mail.
5. **Datenschutzerklärung als Web-Adresse:** `https://asmarfit-project.onrender.com/privacypolicy.html`. Vorher die Platzhalter für Name, Adresse, E-Mail und Datum in `frontend/public/privacypolicy.html` (und Impressum / Nutzungsbedingungen in der App) ausfüllen.
6. **Fragebögen in der Play Console:**
   - *Datensicherheit:* Was die App sammelt (Mahlzeiten, Gewicht, Training liegen lokal auf dem Handy; Fotos und Texte gehen für die KI-Funktionen an den ASFIT-Server; keine Werbung, kein Verkauf von Daten).
   - *Gesundheitsdaten (Health Connect):* Die App liest nur Schritte, Gewicht und Training. Google verlangt dafür eine Begründung pro Berechtigung.
   - *Inhaltseinstufung* und *Zielgruppe* (18+ ist am einfachsten).
   - *KI-Inhalte:* Apps mit KI-Antworten (Coach, Rezepte) brauchen eine Möglichkeit, unpassende Antworten **in der App zu melden**. Diesen „Melden"-Knopf gibt es noch nicht, er muss vor der Einreichung eingebaut werden.
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
