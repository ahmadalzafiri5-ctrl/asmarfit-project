# Mängelliste – Phase-1-Testlauf (15.10.2026, 390px mobile, DE, Frau- & Mann-Pfad)

Legende: [C] Crash/Datenverlust · [F] Funktionsfehler · [T] Übersetzung/Text · [O] Optik/UX

## Offen (Phase 2)
1. [F] Onboarding "Ein paar Zahlen": Validierung nur `> 0` — 500 kg Gewicht oder 999 cm
   Größe gehen durch und erzeugen absurde Kalorienziele. Plausibilitätsgrenzen fehlen
   (App.jsx ~3043, statsValid).
2. [F] Share-Link bei Erstnutzern verloren: Öffnet jemand ohne Profil einen geteilten
   Link (#s=...), wird der Hash sofort verworfen; nach dem Onboarding erscheint kein
   Import-Dialog. Der geteilte Inhalt ist weg.
3. [F] Kein Backup-Restore beim Erststart: Willkommens-Screen bietet keine
   "Backup wiederherstellen"-Option — nach Handywechsel muss man erst das komplette
   Onboarding durchlaufen, bevor man in den Einstellungen wiederherstellen kann.
4. [T] Rechtstexte enthalten Platzhalter: Nutzungsbedingungen zeigen orange
   "[Name/Firma einfügen]" (+ vermutlich Datum) — vor Release füllen.
   → BRAUCHT NUTZER-INPUT (Firmenname), nicht automatisch fixbar.

## Beobachtungen (kein Fix nötig / nice-to-have)
- [O] Übungsbibliothek: Einmalig öffnete ein Zeilen-Klick die Nachbar-Übung
  (Glute Bridge statt Hip Thrust) — nicht reproduzierbar, vermutlich Layout-Shift im
  Klickmoment. Beobachten.
- [O] Wochenplan-Formular ist sichtbar, obwohl Server mealplan:false meldet — Fehler
  kommt erst beim Absenden (sauber: "Diese Funktion ist auf dem Server noch nicht
  eingerichtet"). Könnte man vorab ausblenden.
- [O] Onboarding-Zahlen-Schritt: Weiter-Button wird bei leeren Feldern nur ausgegraut,
  keine Hinweiszeile (konsistent mit anderen Schritten — Design-Entscheidung).

## Getestet & in Ordnung (Phase 1)
- Erststart/Onboarding DE: Frau-Pfad (Abnehmen) & Mann-Pfad, 16+-Alterscheck,
  Kalorienziel plausibel (1350 kcal F/70kg/Abnehmen = TDEE−500)
- Langer Name + Emoji: rendert ohne Overflow
- Rechtstexte öffnen/schließen; Click-through-Consent + Arzt-Hinweis vorhanden
- Home: Makros, Erinnerungen, Schritte, Wasser (200/250/330/500/eigene), Verlauf/Serie
- Training: PlanBuilder-Vorlage (Beine&Po, 3 Tage, Supersets), Plan speichern,
  Plan-Workout mit Satz-Log, Auto-Rest-Timer (90s, +30s, Überspringen), 1RM-Schätzung,
  Zusammenfassung mit Rekord, "Deine Übungen"-Statistik
- Freies Workout (Vortag, EN): Übung wählen, Satz, Rekord
- Kurz-Workouts: Demo-GIF läuft im Quick-Workout (Vortag verifiziert)
- Übungsbibliothek: Für dich/Alle, Filter, Suche, Detail (Demo, Zielmuskeln-3D,
  Bestwert/Meiste Wdh., Einträge, Zurück zur Liste), Favoriten-Stern
- Ernährung: Suche (lokal+USDA+OFF), Hinzufügen mit Mengen-Chips, Toast;
  Barcode-Webfallback mit manueller Eingabe (Nutella-Code → volle Nährwerte);
  FastFood-Budget-Vorschlag (495/500 kcal, Eiweiß-zuerst, 3 Varianten);
  Fasten (16:8 Start/Stop, Alarm, Schwangerschafts-Hinweis); Cheat-Screen
  (positiver Ton); Wochenplan-KI-Fehlerfall sauber
- Fortschritt: Muskel-Rangliste rechnet korrekt (Haupt voll/Hilfsmuskel halb),
  Gewicht speichern + Verlauf, Körpermaße-UI, Übungs-Fortschritt-Empty-States,
  Fotovergleich-Empty-State, Wochen-Check-in-Empty-State (braucht 4 Tage)
- Teilen: "Plan teilen" erzeugt Link mit lesbarem Text + Fallback-Code;
  Import-Dialog bei BESTEHENDEM Profil einwandfrei (Zusammenfassung + Warnung)
- Einstellungen: Dark Mode, DE↔EN, Profil-Kopf, Suche; Backup "In Zwischenablage"
  (version 1, 54 Keys) → komplett-Wipe → "Aus Datei wiederherstellen" VERLUSTFREI;
  3 CSV-Exporte korrekt (Semikolon, deutsche Header, echte Daten)
- Fehlerfälle: Backend aus → Suche zeigt lokalen Treffer + klare Meldung +
  "Tippen zum Wiederholen", kein Freeze; KI-Features scheitern sauber (503-Text)
- Konsole: In sämtlichen Flows keine JS-Errors (nur erwartete Netzwerk-Fehler bei
  Backend-aus/KI-aus)

## Erledigt (Vortag, bereits gepusht)
- [F] Essens-Suche "banana"→"Ananas" (Tippfehler-Matching) → gefixt (8f6a971)
- [O] 18 tote Übersetzungszeilen entfernt (8f6a971)
- [F] Übungsdetail ohne Zurück-zur-Liste → gefixt (15c58de)
