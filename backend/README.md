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

## Fast-food catalog (`GET /api/fastfood/catalog`)

The "Unterwegs essen" planner in the app loads its menus from here, so chains and items can be added or corrected
without releasing a new app version (the app keeps the last answer and has a bundled copy for offline use).

- `catalog/chains/*.json` — one file per chain: `{ id, name, emoji, color, type, region (EU|US|world), src (estimate|dataset|import), pos, items }`.
  A row is `[id, nameDe, nameEn, category, kcal, protein, carbs, fat, max?, weight?]`, category is one of
  `main | starter | salad | side | extra | dessert | drink`.
- `catalog/import/*.csv` — extra tables merged on top at startup. Header:
  `restaurant,item,item_de,kcal,protein,carbs,fat,category,region,max,weight` (category, max and weight are optional;
  the category is guessed from the name when empty). A restaurant that matches an existing chain adds items to it
  (same item names are skipped), an unknown one creates a new chain. Rows whose calories do not roughly match
  protein/carbs/fat (4/4/9 kcal per gram) or without protein are dropped.
- `catalog/source/fastfood_calories.csv` — public US data set (TidyTuesday 2018, nutrition tables of 8 chains) that
  `node tools/build-catalog.mjs` turns into the `src: "dataset"` chains (Taco Bell, Chick-fil-A, Arby's, Sonic, Dairy
  Queen, McDonald's/Burger King/Subway "(USA)"). The same script exports the menus bundled in the frontend.
  Check the data licence before a commercial release.
- Everything with `src: "estimate"` is a rounded estimate, not an official figure — the app says so.

The response carries a `version` (hash of the content). The app sends it back as `?v=…` and gets `{ unchanged: true }`
when nothing changed. Run `node server.js` and open `/api/fastfood/catalog` to check a change.
