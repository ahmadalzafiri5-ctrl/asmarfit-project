# AsmarFit Food API — Backend

Kleiner Node/Express-Server, der zwei externe Lebensmitteldatenbanken hinter
einer sauberen, einheitlichen API zusammenführt:

- **USDA FoodData Central** — Textsuche (`/api/food/search?q=...`)
- **Open Food Facts** — Barcode-Lookup (`/api/food/barcode/:code`)

Beide Antworten werden ins gleiche Format normalisiert, das die AsmarFit-App
schon verwendet: `{ name, per100: { kcal, protein, carbs, fat } }`.

## Setup (für Claude Code)

1. `npm install`
2. `.env.example` zu `.env` kopieren und einen kostenlosen USDA-Key eintragen
   (Signup: https://api.data.gov/signup — ein Formular, Key kommt per Mail)
3. `npm run dev` (startet auf Port 3001, neu laden bei Dateiänderungen)
4. Testen:
   - `curl http://localhost:3001/health`
   - `curl "http://localhost:3001/api/food/search?q=banana"`
   - `curl http://localhost:3001/api/food/barcode/3017624010701`

## Was als Nächstes zu tun ist

Das Frontend (`AsmarFit-App-Prototype.jsx`) verwendet aktuell ein festes,
lokales `FOOD_DB`-Array. Um es an diesen Server anzubinden:

1. In `FoodSearchScreen` die lokale Filterung durch einen `fetch()`-Aufruf an
   `GET /api/food/search?q=${query}` ersetzen (idealerweise mit Debounce,
   z. B. 300ms nach dem letzten Tastendruck).
2. In `BarcodeScanScreen` den simulierten Scan durch einen echten
   Barcode-Scanner ersetzen (z. B. `react-native-vision-camera` +
   `vision-camera-code-scanner` bei React Native, oder die `BarcodeDetector`
   Web-API im Browser) und das Ergebnis an
   `GET /api/food/barcode/:code` schicken.
3. Ladezustand + Fehlerfall anzeigen (Netzwerk kann fehlschlagen, Barcode kann
   unbekannt sein — aktuell gibt der Server dafür `404` mit `{ error: ... }`
   zurück).
4. Für Produktion: diesen Server irgendwo hosten (z. B. Render, Railway, Fly.io)
   statt `localhost`, und `USDA_API_KEY` dort als Umgebungsvariable setzen —
   niemals im Frontend-Code.

## Bekannte Einschränkungen

- USDA-Werte sind bei den meisten Einträgen pro 100g, aber bei manchen
  Markenprodukten (`dataType: "Branded"`) pro Portion vom Etikett — der Server
  markiert das über das `note`-Feld, das Frontend sollte es anzeigen statt
  die Zahl unkommentiert als "pro 100g" auszugeben.
- Rate-Limits: USDA ca. 1.000 Anfragen/Stunde pro Key, Open Food Facts hat
  ein globales Limit mit 503-Antwort bei Überlastung — der eingebaute Cache
  (6 Stunden) fängt wiederholte Suchen ab, sollte bei echten Nutzerzahlen
  aber ggf. länger oder in einer echten Datenbank (Redis) laufen.
