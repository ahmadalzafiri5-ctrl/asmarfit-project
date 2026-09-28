# ASFIT

Fitness- und Ernährungs-App — zweisprachig DE/EN. React 18 + Vite Frontend,
Capacitor 8 für die Android-App, Node/Express-Backend. Deployed auf Render,
Auto-Deploy bei Push auf `master` (GitHub: `ahmadalzafiri5-ctrl/asmarfit-project`).

## Projektstruktur

- `frontend/src/App.jsx` — die gesamte App als eine React-Komponente (mehrere
  tausend Zeilen, mit Absicht ein einzelnes File): Home, Ernährung, Training,
  Fortschritt, Verlauf/Streak, Notizen, Onboarding, Workout-Ablauf,
  Plan-Builder, Übungsbibliothek, Rezepte, Barcode-/Foto-Scan, Einstellungen.
  State liegt komplett in `localStorage` (Prefix `asfit.`), über die Hooks
  `usePersisted`/`usePersistedDaily` — kein eigenes Backend-Konto, keine
  Server-Datenbank für Nutzerdaten.
- `frontend/android/` — Capacitor-Projekt für die Android-APK (ML-Kit
  Barcode-Scan, Health Connect, lokale Benachrichtigungen).
- `backend/server.js` — schlanker Proxy für externe Datenquellen (USDA
  FoodData Central, Open Food Facts) und die KI-Features (Claude: Assistent,
  Foto-Scan, Rezepte, Rezeptbilder). Details und Endpunkte in
  `backend/README.md`.
- `backend/basics.js` — kuratierte Liste gängiger Lebensmittel (DE/EN) mit
  fester Nährwertangabe, damit die Suche für Alltagsbegriffe immer saubere
  Treffer liefert, bevor USDA/Open Food Facts ergänzen.

## Wichtige Konventionen — bitte einhalten

- UI-Texte immer zweisprachig pflegen (`STR`-Objekt im Frontend mit `en`/`de`)
  — jeder neue UI-Text braucht beide Sprachen, keine hartcodierten Strings.
- Design/Farben über `COLORS`/`THEMES` (CSS-Variablen, Light/Dark je Gender-
  Theme) — keine Inline-Hex-Farben in neuen Komponenten.
- `.env` (Backend) niemals committen (ist in `.gitignore`). Secrets nur als
  Umgebungsvariable auf Render setzen, nie im Code oder im Chat einfügen.
- Kleine, nachvollziehbare Commits statt einem großen. Commit-Message kurz und
  beschreibend (Deutsch ist ok, das ist die Sprache des Nutzers).
- Nach jeder Änderung: `npm run build` im Frontend, wenn möglich im Browser
  testen (Claude-Browser-Pane gegen `localhost:5173`), dann committen und
  pushen. Render deployt automatisch.
- Für die Android-App (`.apk`) reicht `npm run build` + `npx cap sync android`
  im Sandbox — der eigentliche Gradle-Build läuft beim Nutzer in Android
  Studio (Sync, dann Build → Generate APKs).

## Wenn etwas unklar ist

Bei Unsicherheit lieber nachfragen statt zu raten — besonders bei Design-
Entscheidungen oder bevor Architekturentscheidungen getroffen werden, die
schwer rückgängig zu machen sind. Der Nutzer schreibt auf Deutsch und mag
knappe, direkte Antworten sowie kleine getestete Schritte statt großer
ungetesteter Umbauten.
