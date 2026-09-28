# ASFIT Backend

Node/Express-Server für die ASFIT-App. Bündelt externe Datenquellen und die
KI-Features (Claude) hinter einer schlanken API, damit keine API-Keys im
Frontend-Code landen. Läuft in Produktion auf Render (`asmarfit-backend`).

## Endpunkte

- `GET /health` — Ping.
- `GET /api/food/search?q=<text>&lang=de|en` — Lebensmittelsuche. Kombiniert
  eine kuratierte Liste gängiger Lebensmittel (`basics.js`), USDA FoodData
  Central (englisch) und Open Food Facts (deutsch, plus Fallback für
  englisch), dedupliziert und gerankt. Cache: 6 Stunden pro Sprache+Begriff.
- `GET /api/food/barcode/:code` — Barcode-Lookup über Open Food Facts. `code`
  muss 6–14 Ziffern sein.
- `POST /api/assistant` — In-App-Assistent (Chat). Braucht `ANTHROPIC_API_KEY`.
- `POST /api/food/photo` — Kalorien/Makros aus einem Essensfoto schätzen
  (Claude Vision). Braucht `ANTHROPIC_API_KEY`.
- `POST /api/recipe` — Ein Rezept per KI generieren. Braucht `ANTHROPIC_API_KEY`.

Alle vier KI-Endpunkte sind pro IP auf 15 Anfragen/Minute begrenzt, um Kosten
zu deckeln.

## Setup

1. `npm install`
2. `.env.example` zu `.env` kopieren:
   - `USDA_API_KEY` — kostenloser Key von https://api.data.gov/signup (ein
     Formular, kommt per Mail). Ohne Key läuft die Suche trotzdem — sie nutzt
     dann für Englisch automatisch Open Food Facts statt USDA.
   - `ANTHROPIC_API_KEY` — optional, schaltet Assistent/Foto-Scan/Rezepte frei.
     Ohne Key antworten diese Endpunkte mit `503 not_configured`, alles andere
     bleibt nutzbar.
3. `npm run dev` (Port 3001, Neustart bei Dateiänderungen).
4. Testen: `curl http://localhost:3001/health`,
   `curl "http://localhost:3001/api/food/search?q=banane&lang=de"`.

## Produktion

Läuft auf Render (Free-Tier-Webservice) hinter dessen Reverse-Proxy — deshalb
ist `trust proxy` gesetzt, sonst würden alle Nutzer für die Rate-Limits als
eine einzige IP erscheinen. Secrets werden ausschließlich als Render-
Umgebungsvariablen gesetzt, nie im Repo.

## Bekannte Einschränkungen

- USDA-Werte sind meist pro 100 g, bei manchen Markenprodukten
  (`dataType: "Branded"`) aber pro Portion vom Etikett — dafür gibt es das
  `note`-Feld, das Frontend zeigt es als Hinweis an.
- Rate-Limits der externen Quellen: USDA ca. 1.000 Anfragen/Stunde pro Key,
  Open Food Facts drosselt bei Überlastung mit `503`. Der eingebaute Cache
  (6 Stunden) fängt wiederholte Suchen ab.
- Die per-IP-Rate-Limits liegen in einer In-Memory-Map (kein Redis) und
  setzen sich bei jedem Neustart/Deploy zurück — für den aktuellen Umfang
  ausreichend, aber kein Schutz gegen gezielten Missbrauch mit wechselnden IPs.
