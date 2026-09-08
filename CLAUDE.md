# AsmarFit

Fitness-App-Prototyp (Ernährung, Krafttraining, Fortschritt, Notizen) — zweisprachig DE/EN.

## Projektstruktur

- `frontend/AsmarFit-App-Prototype.jsx` — Klick-Prototyp als einzelne React-Komponente
  (Design/UI fertig: Home, Nutrition, Training, Progress, Notes, Onboarding,
  Workout-Ablauf, Plan-Builder, Übungsbibliothek, Notiz-Editor, Einstellungen).
  Die Essenssuche nutzt aktuell eine feste, lokale Liste (`FOOD_DB`, ~100 Einträge).
- `backend/server.js` — Node/Express-Server, der zwei externe Datenbanken hinter
  zwei sauberen Endpunkten zusammenfasst:
  - `GET /api/food/search?q=banana` → USDA FoodData Central (Textsuche)
  - `GET /api/food/barcode/:code` → Open Food Facts (Barcode-Lookup)
  Beide Antworten sind bereits auf dasselbe Format normalisiert, das das
  Frontend erwartet: `{ name, per100: { kcal, protein, carbs, fat } }`.
  Noch **nicht** ans Frontend angebunden — das ist die Hauptaufgabe hier.

## Nächste Aufgaben, in dieser Reihenfolge

1. In `backend/`: `npm install` ausführen.
2. Prüfen, ob `backend/.env` existiert und einen echten `USDA_API_KEY` enthält
   (aus `.env.example` kopieren, falls `.env` fehlt). **Ohne gültigen Key
   funktioniert die Suche nicht** — das ist kein Bug im Code. Falls kein Key
   vorhanden ist: den Nutzer bitten, sich kostenlos unter
   https://api.data.gov/signup zu registrieren (ein Formular, Key kommt per
   E-Mail in wenigen Minuten) und ihn in `backend/.env` einzutragen. Erst
   danach mit den nächsten Schritten weitermachen.
3. Server starten (`npm run dev`) und mit curl testen:
   `/health`, `/api/food/search?q=banana`, `/api/food/barcode/3017624010701`.
4. Im Frontend `FoodSearchScreen` so umbauen, dass die Textsuche per `fetch()`
   echte Ergebnisse von `http://localhost:3001/api/food/search?q=...` holt
   (mit ca. 300ms Debounce nach dem letzten Tastendruck), statt die lokale
   `FOOD_DB` zu filtern. Ladezustand und Fehlerfall (Netzwerkfehler, leeres
   Ergebnis, Server nicht erreichbar) anzeigen statt die App abstürzen zu
   lassen.
5. Im Frontend `BarcodeScanScreen` so umbauen, dass "Scan simulieren" einen
   festen Test-Barcode (z. B. `3017624010701`, Nutella) an
   `http://localhost:3001/api/food/barcode/:code` schickt und das echte
   Ergebnis anzeigt statt der fest verdrahteten Mock-Daten.
6. Nach jedem funktionierenden Zwischenschritt committen:
   `git add . && git commit -m "..."` mit kurzer, beschreibender Message.

## Wichtige Konventionen — bitte einhalten

- Datenformat für Lebensmittel bleibt exakt: `{ name, per100: { kcal, protein, carbs, fat } }`.
- UI-Texte immer zweisprachig pflegen (siehe `STR`-Objekt im Frontend mit `en`/`de`) —
  jeder neue UI-Text braucht beide Sprachen, keine hartcodierten Strings.
- Design/Farben/Layout im Frontend nicht verändern — nur die Datenanbindung
  (State, fetch-Aufrufe, Lade-/Fehlerzustände) hinzufügen.
- `.env` niemals committen (ist in `.gitignore`).
- Kleine, nachvollziehbare Commits statt einem großen.

## Wenn etwas unklar ist

Bei Unsicherheit lieber nachfragen statt zu raten — besonders bei Design-
Entscheidungen (z. B. wie ein Ladezustand aussehen soll) oder bevor
Architekturentscheidungen getroffen werden, die schwer rückgängig zu machen sind.
